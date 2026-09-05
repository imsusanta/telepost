export type AIProvider = 'openrouter' | 'cloudflare' | 'gemini';

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
interface GeminiResponse { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string }; }

export const CLOUDFLARE_API_ORIGIN = 'https://api.cloudflare.com';
export const CLOUDFLARE_DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const OPENROUTER_DEFAULT_MODEL = 'google/gemma-4-31b-it:free';
export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_API_ORIGIN = 'https://generativelanguage.googleapis.com/v1beta/models';
const PROVIDER_COOLDOWN_MS = 30 * 60 * 1000;

type Health = { failures: number; downUntil: number; lastError?: string; lastFailureAt?: string; successCount: number; fallbackCount: number };
const health = new Map<AIProvider, Health>();
const getHealth = (provider: AIProvider): Health => health.get(provider) || { failures: 0, downUntil: 0, successCount: 0, fallbackCount: 0 };
function markFailure(provider: AIProvider, error: string): void {
  const current = getHealth(provider);
  const next = { ...current, failures: current.failures + 1, downUntil: Date.now() + PROVIDER_COOLDOWN_MS, lastError: error.substring(0, 300), lastFailureAt: new Date().toISOString() };
  health.set(provider, next);
  console.warn(`[ai-provider] health DOWN provider=${provider} cooldown_minutes=30 error=${next.lastError}`);
}
function markSuccess(provider: AIProvider, wasFallback = false): void {
  const current = getHealth(provider);
  health.set(provider, { ...current, failures: 0, downUntil: 0, lastError: undefined, successCount: current.successCount + 1, fallbackCount: current.fallbackCount + (wasFallback ? 1 : 0) });
}
function isHealthy(provider: AIProvider): boolean { return getHealth(provider).downUntil <= Date.now(); }
export function getAIProviderHealth(): Record<AIProvider, Health & { status: 'healthy' | 'cooldown' }> {
  return Object.fromEntries((['openrouter', 'cloudflare', 'gemini'] as AIProvider[]).map((provider) => [provider, { ...getHealth(provider), status: isHealthy(provider) ? 'healthy' : 'cooldown' }])) as Record<AIProvider, Health & { status: 'healthy' | 'cooldown' }>;
}

function getEnv(key: string): string {
  try { return typeof Deno !== 'undefined' ? Deno.env.get(key)?.trim() || '' : ''; } catch { return ''; }
}

/** Resolve AI credentials from settings and Supabase Edge Function secrets. */
export function resolveAIProvider(settings: AISettings): ResolvedAIProvider {
  const settingsRecord = (settings && typeof settings === 'object' ? settings : {}) as Record<string, any>;
  const openrouterKey = (settingsRecord.openrouter_api_key && typeof settingsRecord.openrouter_api_key === 'string' ? settingsRecord.openrouter_api_key.trim() : '') || getEnv('OPENROUTER_API_KEY');
  const cfToken = (settingsRecord.cloudflare_api_token && typeof settingsRecord.cloudflare_api_token === 'string' ? settingsRecord.cloudflare_api_token.trim() : '') || getEnv('CLOUDFLARE_API_TOKEN');
  const cfAccountId = (settingsRecord.cloudflare_account_id && typeof settingsRecord.cloudflare_account_id === 'string' ? settingsRecord.cloudflare_account_id.trim() : '') || getEnv('CLOUDFLARE_ACCOUNT_ID');
  const geminiKey = (settingsRecord.gemini_api_key && typeof settingsRecord.gemini_api_key === 'string' ? settingsRecord.gemini_api_key.trim() : '') || getEnv('GEMINI_API_KEY') || getEnv('GOOGLE_AI_API_KEY');

  let provider: AIProvider = settings.provider || 'cloudflare';
  if (provider === 'cloudflare' && (!cfToken || !cfAccountId)) provider = openrouterKey ? 'openrouter' : (geminiKey ? 'gemini' : provider);
  else if (provider === 'openrouter' && !openrouterKey) provider = (cfToken && cfAccountId) ? 'cloudflare' : (geminiKey ? 'gemini' : provider);
  else if (provider === 'gemini' && !geminiKey) provider = (cfToken && cfAccountId) ? 'cloudflare' : (openrouterKey ? 'openrouter' : provider);

  const model = settings.model?.trim() || (provider === 'cloudflare' ? CLOUDFLARE_DEFAULT_MODEL : provider === 'gemini' ? GEMINI_DEFAULT_MODEL : OPENROUTER_DEFAULT_MODEL);
  if (provider === 'cloudflare') return { provider, model: model.startsWith('@cf/') ? model : CLOUDFLARE_DEFAULT_MODEL, apiKey: cfToken, accountId: cfAccountId };
  if (provider === 'gemini') return { provider, model: model.startsWith('@cf/') || model.includes('/') ? GEMINI_DEFAULT_MODEL : model, apiKey: geminiKey };
  return { provider: 'openrouter', model: model.startsWith('@cf/') ? OPENROUTER_DEFAULT_MODEL : model, apiKey: openrouterKey };
}

function getAvailableFallbacks(settings: AISettings, primary: ResolvedAIProvider): ResolvedAIProvider[] {
  const settingsRecord = (settings && typeof settings === 'object' ? settings : {}) as Record<string, any>;
  const openrouterKey = (settingsRecord.openrouter_api_key && typeof settingsRecord.openrouter_api_key === 'string' ? settingsRecord.openrouter_api_key.trim() : '') || getEnv('OPENROUTER_API_KEY');
  const cfToken = (settingsRecord.cloudflare_api_token && typeof settingsRecord.cloudflare_api_token === 'string' ? settingsRecord.cloudflare_api_token.trim() : '') || getEnv('CLOUDFLARE_API_TOKEN');
  const cfAccountId = (settingsRecord.cloudflare_account_id && typeof settingsRecord.cloudflare_account_id === 'string' ? settingsRecord.cloudflare_account_id.trim() : '') || getEnv('CLOUDFLARE_ACCOUNT_ID');
  const geminiKey = (settingsRecord.gemini_api_key && typeof settingsRecord.gemini_api_key === 'string' ? settingsRecord.gemini_api_key.trim() : '') || getEnv('GEMINI_API_KEY') || getEnv('GOOGLE_AI_API_KEY');

  const candidates: ResolvedAIProvider[] = [];
  if (primary.provider !== 'cloudflare' && cfToken && cfAccountId) candidates.push({ provider: 'cloudflare', model: CLOUDFLARE_DEFAULT_MODEL, apiKey: cfToken, accountId: cfAccountId });
  if (primary.provider !== 'openrouter' && openrouterKey) candidates.push({ provider: 'openrouter', model: settings.model && !settings.model.startsWith('@cf/') ? settings.model : OPENROUTER_DEFAULT_MODEL, apiKey: openrouterKey });
  if (primary.provider !== 'gemini' && geminiKey) candidates.push({ provider: 'gemini', model: GEMINI_DEFAULT_MODEL, apiKey: geminiKey });
  return candidates.filter((candidate) => isHealthy(candidate.provider));
}

export function cloudflareChatUrl(accountId: string, model = CLOUDFLARE_DEFAULT_MODEL): string {
  const cleanModel = model.startsWith('@cf/') || model.startsWith('@hf/') ? model : `@cf/${model.replace(/^\/+/, '')}`;
  return `${CLOUDFLARE_API_ORIGIN}/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${cleanModel}`;
}

export const cloudflareRunUrl = cloudflareChatUrl;

function parseBody(body: string): unknown { try { return JSON.parse(body) as unknown; } catch { return null; } }
function isTransientStatus(status: number): boolean { return status === 408 || status === 429 || status >= 500; }
function isUnknownModelError(status: number, body: string): boolean { return (status === 400 || status === 404) && /no endpoints found|not a valid model|no allowed providers|model not found/i.test(body); }
function isQuotaOrBillingError(status: number, body: string): boolean { return status === 402 || /insufficient[_ -]?quota|quota[_ -]?exceeded|credits? exhausted|credit balance|billing|payment required|spend limit|budget exceeded|rate limit exceeded|too many requests/i.test(body); }
export function providerError(provider: string, status: number, body: string): Error {
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
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok || !isTransientStatus(response.status) || attempt === 2) return response;
      const retryAfter = Number(response.headers.get('Retry-After'));
      await new Promise(resolve => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 15000) : Math.min(1000 * 2 ** attempt, 8000)));
    } catch (error) { if (attempt === 2) throw error; await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000))); }
    finally { clearTimeout(timeout); }
  }
  throw new Error('AI provider request failed without a response.');
}

async function callProvider(args: { resolved: ResolvedAIProvider; messages: ChatMessage[]; temperature: number; maxTokens: number; timeoutMs: number; appTitle: string }): Promise<string> {
  const { resolved, messages, temperature, maxTokens, timeoutMs, appTitle } = args;
  if (!resolved.apiKey) throw new Error(`API credentials are missing for ${resolved.provider}. Configure the corresponding Supabase Edge Function secret.`);
  if (resolved.provider === 'cloudflare' && !resolved.accountId) throw new Error('Cloudflare Account ID is missing.');

  if (resolved.provider === 'gemini') {
    const url = `${GEMINI_API_ORIGIN}/${encodeURIComponent(resolved.model)}:generateContent?key=${encodeURIComponent(resolved.apiKey)}`;
    const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const body = { contents, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), generationConfig: { temperature, maxOutputTokens: maxTokens } };
    const response = await requestWithRetry(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs);
    const textBody = await response.text();
    if (!response.ok) throw providerError('gemini', response.status, textBody);
    const data = parseBody(textBody) as GeminiResponse | null;
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }

  if (resolved.provider === 'cloudflare') {
    const models = [resolved.model, CLOUDFLARE_DEFAULT_MODEL, '@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.1-8b-instruct'].filter((m, i, a) => m && a.indexOf(m) === i);
    for (const model of models) {
      const response = await requestWithRetry(cloudflareChatUrl(resolved.accountId!, model), { method: 'POST', headers: { Authorization: `Bearer ${resolved.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, temperature, max_tokens: maxTokens, stream: false }) }, timeoutMs);
      const body = await response.text();
      if (response.ok) {
        const data = parseBody(body); if (!data || typeof data !== 'object') throw new Error('Cloudflare Workers AI returned a non-JSON response.');
        const result = data as CloudflareResponse; const text = result.result?.response || result.result?.choices?.[0]?.message?.content || '';
        if (!text) throw new Error('Cloudflare Workers AI returned an empty response.'); return text;
      }
      if (!isUnknownModelError(response.status, body)) throw providerError('cloudflare', response.status, body);
    }
    throw new Error('No configured Cloudflare Workers AI model is available.');
  }

  const call = (model: string) => requestWithRetry(OPENROUTER_CHAT_URL, { method: 'POST', headers: { Authorization: `Bearer ${resolved.apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://telepost.tech', 'X-Title': appTitle }, body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }) }, timeoutMs);
  let response = await call(resolved.model);
  if (!response.ok) { const body = await response.text(); if (isUnknownModelError(response.status, body) && resolved.model !== OPENROUTER_DEFAULT_MODEL) response = await call(OPENROUTER_DEFAULT_MODEL); else throw providerError('openrouter', response.status, body); }
  const body = await response.text(); if (!response.ok) throw providerError('openrouter', response.status, body);
  const data = parseBody(body); const text = data && typeof data === 'object' ? (data as OpenRouterResponse).choices?.[0]?.message?.content || '' : '';
  if (!text) throw new Error('OpenRouter returned an empty response.'); return text;
}

/** Central AI gateway: provider health, automatic failover, third provider and structured usage logs. */
export async function chatCompletion(args: { resolved: ResolvedAIProvider; messages: ChatMessage[]; temperature?: number; maxTokens?: number; timeoutMs?: number; appTitle?: string }): Promise<string> {
  const { resolved, messages, temperature = 0.7, maxTokens = 2048, timeoutMs = 90000, appTitle = 'TelePost' } = args;
  if (!resolved.apiKey) throw new Error(`API credentials are missing for ${resolved.provider}. Configure the corresponding Supabase Edge Function secret.`);
  if (resolved.provider === 'cloudflare' && !resolved.accountId) throw new Error('Cloudflare Account ID is missing.');

  const providers = [resolved, ...getAvailableFallbacks({ provider: resolved.provider, model: resolved.model, temperature }, resolved)];
  let lastError: Error | null = null;
  const startedAt = Date.now();

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    if (!isHealthy(provider.provider)) continue;
    try {
      console.info(JSON.stringify({ event: 'ai_request_start', provider: provider.provider, model: provider.model, attempt: index + 1, fallback: index > 0 }));
      const text = await callProvider({ resolved: provider, messages, temperature, maxTokens, timeoutMs, appTitle });
      markSuccess(provider.provider, index > 0);
      console.info(JSON.stringify({ event: 'ai_request_success', provider: provider.provider, model: provider.model, fallback: index > 0, latency_ms: Date.now() - startedAt }));
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const message = lastError.message;
      console.error(JSON.stringify({ event: 'ai_request_failure', provider: provider.provider, model: provider.model, error: message.substring(0, 500), latency_ms: Date.now() - startedAt }));
      const statusMatch = message.match(/error \((\d+)\)/i); const status = statusMatch ? Number(statusMatch[1]) : 0;
      const canFailover = status === 0 || status >= 500 || isQuotaOrBillingError(status, message) || /timeout|temporarily|unavailable/i.test(message);
      if (!canFailover) throw lastError;
      markFailure(provider.provider, message);
      if (index < providers.length - 1) console.warn(`[ai-provider] FAILOVER ${provider.provider} -> ${providers[index + 1].provider}`);
    }
  }
  throw lastError || new Error('All AI providers are unavailable.');
}

export function parseJsonObject(text: string): Record<string, unknown> {
  let cleaned = text.trim().replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object.');
  return parsed as Record<string, unknown>;
}