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

export const CLOUDFLARE_API_ORIGIN = 'https://api.cloudflare.com';
export const CLOUDFLARE_DEFAULT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openrouter: OPENROUTER_DEFAULT_MODEL,
  cloudflare: CLOUDFLARE_DEFAULT_MODEL,
};

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Resolve the configured provider with environment fallback and intelligent provider switching.
 */
export function resolveAIProvider(settings: AISettings): ResolvedAIProvider {
  const getEnv = (key: string): string => {
    try {
      if (typeof Deno !== 'undefined' && Deno.env) {
        return Deno.env.get(key)?.trim() || '';
      }
    } catch {
      // Env access may fail in restricted sandboxes
    }
    return '';
  };

  const openrouterKey = settings.openrouter_api_key?.trim() || getEnv('OPENROUTER_API_KEY') || '';
  const cfToken = settings.cloudflare_api_token?.trim() || getEnv('CLOUDFLARE_API_TOKEN') || '';
  const cfAccountId = settings.cloudflare_account_id?.trim() || getEnv('CLOUDFLARE_ACCOUNT_ID') || '';

  // Determine provider: use selected provider, but fallback if credentials exist only for the other provider
  let provider: AIProvider = settings.provider === 'cloudflare' ? 'cloudflare' : 'openrouter';

  if (provider === 'cloudflare' && (!cfToken || !cfAccountId) && openrouterKey) {
    provider = 'openrouter';
  } else if (provider === 'openrouter' && !openrouterKey && (cfToken && cfAccountId)) {
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

/** OpenRouter returns 400/404 when a model ID was renamed or retired. */
function isUnknownModelError(status: number, body: string): boolean {
  if (status !== 400 && status !== 404) return false;
  const lowered = body.toLowerCase();
  return lowered.includes('no endpoints found')
    || lowered.includes('not a valid model')
    || lowered.includes('no allowed providers')
    || lowered.includes('model not found');
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
    const candidateModels = [resolved.model];
    if (resolved.model !== '@cf/meta/llama-3.3-70b-instruct-fp8-fast') {
      candidateModels.push('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    }
    if (resolved.model !== '@cf/openai/gpt-oss-120b') {
      candidateModels.push('@cf/openai/gpt-oss-120b');
    }
    if (resolved.model !== '@cf/meta/llama-3.1-8b-instruct') {
      candidateModels.push('@cf/meta/llama-3.1-8b-instruct');
    }

    let lastError: Error | null = null;

    for (const modelToTry of candidateModels) {
      try {
        const url = cloudflareChatUrl(resolved.accountId!, modelToTry);
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
      } catch (err: any) {
        lastError = err;
        console.warn(`[ai-provider] Cloudflare model ${modelToTry} failed: ${err.message}. Trying next candidate...`);
      }
    }

    throw lastError || new Error('All Cloudflare models failed.');
  }

  const callOpenRouter = async (model: string): Promise<{ ok: boolean; status: number; body: string }> => {
    const response = await fetchWithTimeout(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://telepost.tech',
        'X-Title': appTitle,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    }, timeoutMs);

    return { ok: response.ok, status: response.status, body: await response.text() };
  };

  let attempt = await callOpenRouter(resolved.model);

  // Retired/renamed model IDs are a common cause of "AI not working".
  // Retry once with the current default model instead of failing hard.
  if (!attempt.ok && isUnknownModelError(attempt.status, attempt.body) && resolved.model !== OPENROUTER_DEFAULT_MODEL) {
    console.warn(`[ai-provider] OpenRouter model "${resolved.model}" unavailable, retrying with ${OPENROUTER_DEFAULT_MODEL}.`);
    attempt = await callOpenRouter(OPENROUTER_DEFAULT_MODEL);
  }

  if (!attempt.ok) throw providerError(resolved.provider, attempt.status, attempt.body);

  let data: any;
  try {
    data = JSON.parse(attempt.body);
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
