export type AIProvider = 'openrouter' | 'cloudflare';

export interface AISettings {
  provider: AIProvider;
  model: string;
  temperature: number;
  system_prompt?: string;
  image_model?: string;
  openrouter_image_model?: string;
}

export interface ResolvedAIProvider {
  provider: AIProvider;
  model: string;
  apiKey: string;
  accountId?: string;
}

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }
interface CloudflareResponse { success?: boolean; result?: { response?: string; choices?: Array<{ message?: { content?: string } }>; error?: string }; errors?: Array<{ message?: string }>; message?: string; }
interface OpenRouterResponse { choices?: Array<{ message?: { content?: string } }>; }

export const CLOUDFLARE_API_ORIGIN = 'https://api.cloudflare.com';
export const CLOUDFLARE_DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-001';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getEnv(key: string): string {
  try { return typeof Deno !== 'undefined' ? Deno.env.get(key)?.trim() || '' : ''; } catch { return ''; }
}

/** Resolve AI credentials exclusively from Supabase Edge Function secrets. */
export function resolveAIProvider(settings: AISettings): ResolvedAIProvider {
  const openrouterKey = getEnv('OPENROUTER_API_KEY');
  const cfToken = getEnv('CLOUDFLARE_API_TOKEN');
  const cfAccountId = getEnv('CLOUDFLARE_ACCOUNT_ID');
  let provider: AIProvider = settings.provider;
  if (provider === 'cloudflare' && (!cfToken || !cfAccountId) && openrouterKey) provider = 'openrouter';
  else if (provider === 'openrouter' && !openrouterKey && cfToken && cfAccountId) provider = 'cloudflare';
  const model = settings.model?.trim() || (provider === 'cloudflare' ? CLOUDFLARE_DEFAULT_MODEL : OPENROUTER_DEFAULT_MODEL);
  return provider === 'cloudflare'
    ? { provider, model: model.startsWith('@cf/') ? model : CLOUDFLARE_DEFAULT_MODEL, apiKey: cfToken, accountId: cfAccountId }
    : { provider, model: model.startsWith('@cf/') ? OPENROUTER_DEFAULT_MODEL : model, apiKey: openrouterKey };
}

function getAvailableFallback(settings: AISettings, primary: ResolvedAIProvider): ResolvedAIProvider | null {
  const openrouterKey = getEnv('OPENROUTER_API_KEY');
  const cfToken = getEnv('CLOUDFLARE_API_TOKEN');
  const cfAccountId = getEnv('CLOUDFLARE_ACCOUNT_ID');

  if (primary.provider === 'openrouter' && cfToken && cfAccountId) {
    return {
      provider: 'cloudflare',
      model: CLOUDFLARE_DEFAULT_MODEL,
      apiKey: cfToken,
      accountId: cfAccountId,
    };
  }

  if (primary.provider === 'cloudflare' && openrouterKey) {
    const configuredModel = settings.model?.trim();
    return {
      provider: 'openrouter',
      model: configuredModel && !configuredModel.startsWith('@cf/') ? configuredModel : OPENROUTER_DEFAULT_MODEL,
      apiKey: openrouterKey,
    };
  }

  return null;
}

export function cloudflareChatUrl(accountId: string, model = CLOUDFLARE_DEFAULT_MODEL): string {
  if (!model.startsWith('@cf/')) throw new Error(`Invalid Cloudflare Workers AI model ID: ${model}`);
  return `${CLOUDFLARE_API_ORIGIN}/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
}

function parseBody(body: string): unknown { try { return JSON.parse(body) as unknown; } catch { return null; } }
function isTransientStatus(status: number): boolean { return status === 408 || status === 429 || status >= 500; }
function isUnknownModelError(status: number, body: string): boolean { return (status === 400 || status === 404) && /no endpoints found|not a valid model|no allowed providers|model not found/i.test(body); }
function providerError(provider: string, status: number, body: string): Error {
  const parsed = parseBody(body);
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const error = record.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : undefined;
    const errors = Array.isArray(record.errors) ? record.errors : [];
    const first = errors[0] && typeof errors[0] === 'object' ? errors[0] as Record<string, unknown> : undefined;
    return new Error(`${provider} error (${status}): ${String(error?.message || first?.message || record.message || body).substring(0, 500)}`);
  }
  return new Error(`${provider} error (${status}): ${body.substring(0, 500)}`);
}

async function requestWithRetry(url: string, init: RequestInit, timeoutMs = 90000): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok || !isTransientStatus(response.status) || attempt === 2) return response;
      const retryAfter = Number(response.headers.get('Retry-After'));
      await new Promise(resolve => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 15000) : Math.min(1000 * 2 ** attempt, 8000)));
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
    } finally { clearTimeout(timeout); }
  }
  throw new Error('AI provider request failed without a response.');
}

async function callProvider(args: { resolved: ResolvedAIProvider; messages: ChatMessage[]; temperature: number; maxTokens: number; timeoutMs: number; appTitle: string }): Promise<string> {
  const { resolved, messages, temperature, maxTokens, timeoutMs, appTitle } = args;

  if (!resolved.apiKey) throw new Error(`API credentials are missing for ${resolved.provider}. Configure the corresponding Supabase Edge Function secret.`);
  if (resolved.provider === 'cloudflare' && !resolved.accountId) throw new Error('Cloudflare Account ID is missing. Configure CLOUDFLARE_ACCOUNT_ID.');

  if (resolved.provider === 'cloudflare') {
    const models = [resolved.model, CLOUDFLARE_DEFAULT_MODEL, '@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.1-8b-instruct'].filter((m, i, a) => m && a.indexOf(m) === i);
    for (const model of models) {
      const response = await requestWithRetry(cloudflareChatUrl(resolved.accountId!, model), {
        method: 'POST',
        headers: { Authorization: `Bearer ${resolved.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, temperature, max_tokens: maxTokens, stream: false }),
      }, timeoutMs);
      const body = await response.text();
      if (response.ok) {
        const data = parseBody(body);
        if (!data || typeof data !== 'object') throw new Error('Cloudflare Workers AI returned a non-JSON response.');
        const result = data as CloudflareResponse;
        const text = result.result?.response || result.result?.choices?.[0]?.message?.content || '';
        if (!text) throw new Error('Cloudflare Workers AI returned an empty response.');
        return text;
      }
      if (!isUnknownModelError(response.status, body)) throw providerError('cloudflare', response.status, body);
    }
    throw new Error('No configured Cloudflare Workers AI model is available.');
  }

  const call = (model: string) => requestWithRetry(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://telepost.tech',
      'X-Title': appTitle,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  }, timeoutMs);

  let response = await call(resolved.model);
  if (!response.ok) {
    const body = await response.text();
    if (isUnknownModelError(response.status, body) && resolved.model !== OPENROUTER_DEFAULT_MODEL) {
      response = await call(OPENROUTER_DEFAULT_MODEL);
    } else {
      throw providerError('openrouter', response.status, body);
    }
  }

  const body = await response.text();
  if (!response.ok) throw providerError('openrouter', response.status, body);
  const data = parseBody(body);
  const text = data && typeof data === 'object' ? (data as OpenRouterResponse).choices?.[0]?.message?.content || '' : '';
  if (!text) throw new Error('OpenRouter returned an empty response.');
  return text;
}

/**
 * Generate a completion with automatic provider failover.
 *
 * Failover is attempted for quota/billing exhaustion, rate limits, timeouts,
 * and provider-side 5xx errors. Invalid credentials, malformed requests,
 * invalid prompts, and other client errors are surfaced immediately.
 */
export async function chatCompletion(args: { resolved: ResolvedAIProvider; messages: ChatMessage[]; temperature?: number; maxTokens?: number; timeoutMs?: number; appTitle?: string }): Promise<string> {
  const { resolved, messages, temperature = 0.7, maxTokens = 2048, timeoutMs = 90000, appTitle = 'TelePost' } = args;
  if (!resolved.apiKey) throw new Error(`API credentials are missing for ${resolved.provider}. Configure the corresponding Supabase Edge Function secret.`);
  if (resolved.provider === 'cloudflare' && !resolved.accountId) throw new Error('Cloudflare Account ID is missing. Configure CLOUDFLARE_ACCOUNT_ID.');

  const settings: AISettings = {
    provider: resolved.provider,
    model: resolved.model,
    temperature,
  };
  const fallback = getAvailableFallback(settings, resolved);
  const providers = fallback ? [resolved, fallback] : [resolved];
  let lastError: Error | null = null;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    try {
      const text = await callProvider({ resolved: provider, messages, temperature, maxTokens, timeoutMs, appTitle });
      if (index > 0) console.warn(`[ai-provider] Primary provider failed; failover succeeded with ${provider.provider}/${provider.model}`);
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const message = lastError.message;
      console.error(`[ai-provider] ${provider.provider}/${provider.model} failed: ${message}`);

      // Only continue to another provider for errors that are plausibly provider-side.
      // Client/configuration errors should not be hidden by an unrelated fallback.
      const statusMatch = message.match(/error \((\d+)\)/i);
      const status = statusMatch ? Number(statusMatch[1]) : 0;
      const canFailover = status === 0 || status >= 500 || status === 402 || status === 408 || status === 429 || /quota|credit|billing|rate limit|timeout|temporarily|unavailable/i.test(message);
      if (!canFailover || index === providers.length - 1) throw lastError;
    }
  }

  throw lastError || new Error('AI provider request failed.');
}

export function parseJsonObject(text: string): Record<string, unknown> {
  let cleaned = text.trim().replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object.');
  return parsed as Record<string, unknown>;
}