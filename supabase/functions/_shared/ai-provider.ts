export type AIProvider = 'openrouter' | 'cloudflare';

export interface AISettings {
  provider: AIProvider;
  model: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  cloudflare_account_id?: string;
  cloudflare_api_token?: string;
}

export interface ResolvedAIProvider {
  provider: AIProvider;
  model: string;
  apiKey: string;
  accountId?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CloudflareChoice {
  message?: {
    content?: string;
  };
}

interface CloudflareResult {
  response?: string;
  choices?: CloudflareChoice[];
  error?: string;
}

interface CloudflareResponse {
  success?: boolean;
  result?: CloudflareResult;
  errors?: Array<{ message?: string }>;
  message?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export const CLOUDFLARE_API_ORIGIN = 'https://api.cloudflare.com';
export const CLOUDFLARE_DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: OPENROUTER_DEFAULT_MODEL,
  cloudflare: CLOUDFLARE_DEFAULT_MODEL,
};

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function resolveAIProvider(settings: AISettings): ResolvedAIProvider {
  const getEnv = (key: string): string => {
    try {
      if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key)?.trim() || '';
    } catch {
      // Ignore restricted environments and use database configuration.
    }
    return '';
  };

  const openrouterKey = settings.openrouter_api_key?.trim() || getEnv('OPENROUTER_API_KEY') || '';
  const cfToken = settings.cloudflare_api_token?.trim() || getEnv('CLOUDFLARE_API_TOKEN') || '';
  const cfAccountId = settings.cloudflare_account_id?.trim() || getEnv('CLOUDFLARE_ACCOUNT_ID') || '';

  let provider: AIProvider = settings.provider === 'cloudflare' ? 'cloudflare' : 'openrouter';

  if (provider === 'cloudflare' && (!cfToken || !cfAccountId) && openrouterKey) {
    provider = 'openrouter';
  } else if (provider === 'openrouter' && !openrouterKey && cfToken && cfAccountId) {
    provider = 'cloudflare';
  }

  const requestedModel = settings.model?.trim() || DEFAULT_MODELS[provider];

  if (provider === 'cloudflare') {
    return {
      provider,
      model: requestedModel.startsWith('@cf/') ? requestedModel : CLOUDFLARE_DEFAULT_MODEL,
      apiKey: cfToken,
      accountId: cfAccountId,
    };
  }

  return {
    provider,
    model: requestedModel.startsWith('@cf/') ? OPENROUTER_DEFAULT_MODEL : requestedModel,
    apiKey: openrouterKey,
  };
}

export function cloudflareChatUrl(accountId: string, model = CLOUDFLARE_DEFAULT_MODEL): string {
  if (!model.startsWith('@cf/')) {
    throw new Error(`Invalid Cloudflare Workers AI model ID: ${model}. Model IDs must start with @cf/.`);
  }
  return `${CLOUDFLARE_API_ORIGIN}/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;
}

export function cloudflareRunUrl(accountId: string, model: string): string {
  return cloudflareChatUrl(accountId, model);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function providerError(provider: string, status: number, body: string): Error {
  const parsed = parseBody(body);
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    const error = record.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : undefined;
    const errors = Array.isArray(record.errors) ? record.errors : [];
    const firstError = errors[0] && typeof errors[0] === 'object' ? errors[0] as Record<string, unknown> : undefined;
    const result = record.result && typeof record.result === 'object' ? record.result as Record<string, unknown> : undefined;
    const message = error?.message || firstError?.message || result?.error || record.message || body;
    return new Error(`${provider} error (${status}): ${String(message).substring(0, 500)}`);
  }
  return new Error(`${provider} error (${status}): ${body.substring(0, 500)}`);
}

function isUnknownModelError(status: number, body: string): boolean {
  if (status !== 400 && status !== 404) return false;
  const lowered = body.toLowerCase();
  return lowered.includes('no endpoints found')
    || lowered.includes('not a valid model')
    || lowered.includes('no allowed providers')
    || lowered.includes('model not found');
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function requestWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  maxAttempts = 3,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);
      lastResponse = response;
      if (response.ok || !isTransientStatus(response.status) || attempt === maxAttempts - 1) return response;

      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? Math.min(retryAfterSeconds * 1000, 15000)
        : Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
      const delayMs = Math.min(1000 * 2 ** attempt, 8000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('AI provider request failed without a response.');
}

function extractCloudflareText(data: CloudflareResponse): string {
  const result = data.result;
  const firstChoice = result?.choices?.[0];
  return result?.response || firstChoice?.message?.content || '';
}

function extractOpenRouterText(data: OpenRouterResponse): string {
  return data.choices?.[0]?.message?.content || '';
}

export async function chatCompletion(args: {
  resolved: ResolvedAIProvider;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  appTitle?: string;
}): Promise<string> {
  const {
    resolved,
    messages,
    temperature = 0.7,
    maxTokens = 2048,
    timeoutMs = 90000,
    appTitle = 'TelePost',
  } = args;

  if (!resolved.apiKey) throw new Error(`API credentials are missing for ${resolved.provider}.`);
  if (resolved.provider === 'cloudflare' && !resolved.accountId) throw new Error('Cloudflare Account ID is missing.');
  if (resolved.provider === 'cloudflare' && !resolved.model.startsWith('@cf/')) {
    throw new Error('Cloudflare Workers AI model IDs must start with @cf/.');
  }

  if (resolved.provider === 'cloudflare') {
    const candidateModels = [resolved.model];
    if (resolved.model !== CLOUDFLARE_DEFAULT_MODEL) candidateModels.push(CLOUDFLARE_DEFAULT_MODEL);
    if (!candidateModels.includes('@cf/openai/gpt-oss-120b')) candidateModels.push('@cf/openai/gpt-oss-120b');
    if (!candidateModels.includes('@cf/meta/llama-3.1-8b-instruct')) candidateModels.push('@cf/meta/llama-3.1-8b-instruct');

    for (const modelToTry of candidateModels) {
      const url = cloudflareChatUrl(resolved.accountId!, modelToTry);
      const response = await requestWithRetry(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resolved.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, temperature, max_tokens: maxTokens, stream: false }),
      }, timeoutMs);

      const body = await response.text();
      if (response.ok) {
        const parsed = parseBody(body);
        if (!parsed || typeof parsed !== 'object') throw new Error('Cloudflare Workers AI returned a non-JSON response.');
        const data = parsed as CloudflareResponse;
        if (data.success === false) throw providerError(resolved.provider, response.status || 500, body);
        const text = extractCloudflareText(data);
        if (!text) throw new Error('Cloudflare Workers AI returned an empty response.');
        return text;
      }

      // Only try the next model when this model itself is unavailable. Do not
      // hide invalid credentials, permission failures, rate limits, or outages.
      if (!isUnknownModelError(response.status, body)) {
        throw providerError(resolved.provider, response.status, body);
      }

      console.warn(`[ai-provider] Cloudflare model ${modelToTry} unavailable; trying next candidate.`);
    }

    throw new Error('No configured Cloudflare Workers AI model is available for this account.');
  }

  const callOpenRouter = async (model: string): Promise<Response> => requestWithRetry(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://telepost.tech',
      'X-Title': appTitle,
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  }, timeoutMs);

  let response = await callOpenRouter(resolved.model);
  if (!response.ok) {
    const body = await response.text();
    if (isUnknownModelError(response.status, body) && resolved.model !== OPENROUTER_DEFAULT_MODEL) {
      console.warn(`[ai-provider] OpenRouter model "${resolved.model}" unavailable; retrying with ${OPENROUTER_DEFAULT_MODEL}.`);
      response = await callOpenRouter(OPENROUTER_DEFAULT_MODEL);
    } else {
      throw providerError(resolved.provider, response.status, body);
    }
  }

  const body = await response.text();
  if (!response.ok) throw providerError(resolved.provider, response.status, body);

  const parsed = parseBody(body);
  if (!parsed || typeof parsed !== 'object') throw new Error('OpenRouter returned a non-JSON response.');
  const text = extractOpenRouterText(parsed as OpenRouterResponse);
  if (!text) throw new Error('OpenRouter returned an empty response.');
  return text;
}

export function parseJsonObject(text: string): Record<string, unknown> {
  let cleaned = text.trim().replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object.');
  return parsed as Record<string, unknown>;
}
