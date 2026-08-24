export type AIProvider = 'openrouter' | 'lovable' | 'gemini' | 'openai' | 'cloudflare';

export interface AISettings {
  provider: AIProvider;
  model: string;
  temperature: number;
  system_prompt?: string;
  openrouter_api_key?: string;
  gemini_api_key?: string;
  openai_api_key?: string;
  cloudflare_account_id?: string;
  cloudflare_api_token?: string;
}

export interface ResolvedAIProvider {
  provider: Exclude<AIProvider, 'lovable'>;
  model: string;
  apiKey: string;
  accountId?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const CLOUDFLARE_API_ORIGIN = 'https:' + '//api.cloudflare.com';
const GEMINI_API_ORIGIN = 'https:' + '//generativelanguage.googleapis.com';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: 'google/gemini-2.0-flash-exp:free',
  lovable: 'google/gemini-2.0-flash-exp:free',
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
};

export function resolveAIProvider(settings: AISettings): ResolvedAIProvider {
  const requested = settings.provider || 'openrouter';
  const preferred = requested === 'lovable' ? 'openrouter' : requested;
  const requestedModel = settings.model?.trim() || DEFAULT_MODELS[requested];

  const candidates: ResolvedAIProvider[] = [];
  if (settings.cloudflare_api_token && settings.cloudflare_account_id) {
    candidates.push({
      provider: 'cloudflare',
      apiKey: settings.cloudflare_api_token,
      accountId: settings.cloudflare_account_id,
      model: preferred === 'cloudflare' ? requestedModel : DEFAULT_MODELS.cloudflare,
    });
  }
  if (settings.openrouter_api_key) {
    candidates.push({
      provider: 'openrouter',
      apiKey: settings.openrouter_api_key,
      model: preferred === 'openrouter' ? requestedModel : DEFAULT_MODELS.openrouter,
    });
  }
  if (settings.gemini_api_key) {
    candidates.push({
      provider: 'gemini',
      apiKey: settings.gemini_api_key,
      model: preferred === 'gemini' ? requestedModel : DEFAULT_MODELS.gemini,
    });
  }
  if (settings.openai_api_key) {
    candidates.push({
      provider: 'openai',
      apiKey: settings.openai_api_key,
      model: preferred === 'openai' ? requestedModel : DEFAULT_MODELS.openai,
    });
  }

  return candidates.find((candidate) => candidate.provider === preferred) || candidates[0] || {
    provider: preferred,
    model: requestedModel,
    apiKey: '',
    accountId: settings.cloudflare_account_id,
  };
}

function cloudflareChatUrl(accountId: string): string {
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

function providerError(provider: string, status: number, body: string): Error {
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

  if (resolved.provider === 'gemini') {
    const prompt = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
    const response = await fetchWithTimeout(
      `${GEMINI_API_ORIGIN}/v1beta/models/${resolved.model}:generateContent?key=${resolved.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      },
      timeoutMs,
    );
    const body = await response.text();
    if (!response.ok) throw providerError('gemini', response.status, body);
    const data = JSON.parse(body);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }

  const url = resolved.provider === 'cloudflare'
    ? cloudflareChatUrl(resolved.accountId!)
    : resolved.provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
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
  const text = data?.choices?.[0]?.message?.content || data?.result?.choices?.[0]?.message?.content || '';
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
