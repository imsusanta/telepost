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

const CLOUDFLARE_API_ORIGIN = 'https:' + '//api.cloudflare.com';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: 'google/gemini-2.0-flash-exp:free',
  cloudflare: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
};

export function resolveAIProvider(settings: AISettings): ResolvedAIProvider {
  const preferred: AIProvider = settings.provider === 'cloudflare' ? 'cloudflare' : 'openrouter';
  const requestedModel = settings.model?.trim() || DEFAULT_MODELS[preferred];

  const candidates: ResolvedAIProvider[] = [];
  if (settings.cloudflare_api_token && settings.cloudflare_account_id) {
    const cloudflareModel = preferred === 'cloudflare' ? requestedModel : DEFAULT_MODELS.cloudflare;
    candidates.push({
      provider: 'cloudflare',
      apiKey: settings.cloudflare_api_token,
      accountId: settings.cloudflare_account_id,
      // Cloudflare only serves its own hosted Workers AI catalog (@cf/...).
      model: cloudflareModel.startsWith('@cf/') ? cloudflareModel : DEFAULT_MODELS.cloudflare,
    });
  }
  if (settings.openrouter_api_key) {
    candidates.push({
      provider: 'openrouter',
      apiKey: settings.openrouter_api_key,
      model: preferred === 'openrouter' ? requestedModel : DEFAULT_MODELS.openrouter,
    });
  }

  return candidates.find((candidate) => candidate.provider === preferred) || candidates[0] || {
    provider: preferred,
    model: requestedModel,
    apiKey: '',
    accountId: settings.cloudflare_account_id,
  };
}

export function cloudflareChatUrl(accountId: string): string {
  return `${CLOUDFLARE_API_ORIGIN}/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`;
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

export function providerError(provider: string, status: number, body: string): Error {
  try {
    const data = JSON.parse(body);
    const message = data?.error?.message || data?.errors?.[0]?.message || data?.result?.error || body;
    return new Error(`${provider} error (${status}): ${String(message).substring(0, 500)}`);
  } catch {
    return new Error(`${provider} error (${status}): ${body.substring(0, 500)}`);
  }
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
  if (resolved.provider === 'cloudflare' && !resolved.accountId) {
    throw new Error('Cloudflare Account ID is missing.');
  }
  if (resolved.provider === 'cloudflare' && !resolved.model.startsWith('@cf/')) {
    throw new Error('Cloudflare Workers AI model IDs must start with @cf/.');
  }

  const url = resolved.provider === 'cloudflare'
    ? cloudflareChatUrl(resolved.accountId!)
    : 'https://openrouter.ai/api/v1/chat/completions';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${resolved.apiKey}`,
    'Content-Type': 'application/json',
  };
  if (resolved.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://telepost.tech';
    headers['X-Title'] = appTitle;
  }

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: resolved.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    },
    timeoutMs,
  );
  const body = await response.text();
  if (!response.ok) throw providerError(resolved.provider, response.status, body);

  const data = JSON.parse(body);
  const text = data?.choices?.[0]?.message?.content
    || data?.result?.choices?.[0]?.message?.content
    || data?.result?.response
    || '';
  if (!text) throw new Error(`${resolved.provider} returned an empty response.`);
  return text;
}

export function parseJsonObject(text: string): Record<string, unknown> {
  let cleaned = text.trim().replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}
