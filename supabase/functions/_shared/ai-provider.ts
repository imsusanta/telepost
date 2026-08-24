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

const CLOUDFLARE_API_ORIGIN = 'https://api.cloudflare.com';
const CLOUDFLARE_DEFAULT_MODEL = '@cf/openai/gpt-oss-20b';
const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: OPENROUTER_DEFAULT_MODEL,
  cloudflare: CLOUDFLARE_DEFAULT_MODEL,
};

/**
 * Resolve the configured provider without silently switching providers.
 * If Cloudflare is selected, a missing/invalid Cloudflare credential must
 * fail instead of unexpectedly using an OpenRouter key.
 */
export function resolveAIProvider(settings: AISettings): ResolvedAIProvider {
  const provider: AIProvider = settings.provider === 'cloudflare' ? 'cloudflare' : 'openrouter';
  const requestedModel = settings.model?.trim() || DEFAULT_MODELS[provider];

  if (provider === 'cloudflare') {
    return {
      provider,
      model: requestedModel.startsWith('@cf/') ? requestedModel : CLOUDFLARE_DEFAULT_MODEL,
      apiKey: settings.cloudflare_api_token?.trim() || '',
      accountId: settings.cloudflare_account_id?.trim() || '',
    };
  }

  return {
    provider,
    model: requestedModel,
    apiKey: settings.openrouter_api_key?.trim() || '',
  };
}

export function cloudflareChatUrl(accountId: string, model = CLOUDFLARE_DEFAULT_MODEL): string {
  if (!model.startsWith('@cf/')) {
    throw new Error(`Invalid Cloudflare Workers AI model ID: ${model}. Model IDs must start with @cf/.`);
  }
  return `${CLOUDFLARE_API_ORIGIN}/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(model)}`;
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
    const message = data?.error?.message
      || data?.errors?.[0]?.message
      || data?.result?.error
      || data?.message
      || body;
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

  if (resolved.provider === 'cloudflare') {
    const url = cloudflareChatUrl(resolved.accountId!, resolved.model);
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    }, timeoutMs);

    const body = await response.text();
    if (!response.ok) throw providerError(resolved.provider, response.status, body);

    let data: any;
    try {
      data = JSON.parse(body);
    } catch {
      throw new Error('Cloudflare Workers AI returned a non-JSON response.');
    }

    if (data?.success === false) {
      throw providerError(resolved.provider, response.status || 500, body);
    }

    const text = data?.result?.response
      || data?.result?.choices?.[0]?.message?.content
      || data?.choices?.[0]?.message?.content
      || '';

    if (!text || typeof text !== 'string') {
      throw new Error('Cloudflare Workers AI returned an empty response.');
    }
    return text;
  }

  const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resolved.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://telepost.tech',
      'X-Title': appTitle,
    },
    body: JSON.stringify({ model: resolved.model, messages, temperature, max_tokens: maxTokens }),
  }, timeoutMs);

  const body = await response.text();
  if (!response.ok) throw providerError(resolved.provider, response.status, body);

  let data: any;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error('OpenRouter returned a non-JSON response.');
  }

  const text = data?.choices?.[0]?.message?.content || '';
  if (!text || typeof text !== 'string') throw new Error('OpenRouter returned an empty response.');
  return text;
}

export function parseJsonObject(text: string): Record<string, unknown> {
  let cleaned = text.trim().replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}
