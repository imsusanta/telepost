export type TelegramSendKind =
  | "success"
  | "rate_limited"
  | "timeout"
  | "network"
  | "ambiguous"
  | "definitive_failure";

export interface TelegramSendResult {
  kind: TelegramSendKind;
  status: number;
  retryAfterMs?: number;
  description?: string;
  body?: Record<string, unknown> | null;
}

export interface TelegramRequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_RETRIES = 3;
const MAX_RETRY_AFTER_MS = 60_000;

export function classifyTelegramFailure(
  status: number,
  description: string,
  timedOut: boolean,
  networkError: boolean,
): TelegramSendKind {
  if (timedOut) return "timeout";
  if (networkError) return "network";
  if (status === 429) return "rate_limited";
  if (status >= 500 || status === 0) return "ambiguous";

  const text = description.toLowerCase();
  const definitivePatterns = [
    "chat not found",
    "bot was blocked",
    "bot is not a member",
    "have no rights",
    "unauthorized",
    "wrong file identifier",
    "bad request",
    "message is too long",
    "poll can't",
  ];
  if (status >= 400 && status < 500) {
    if (definitivePatterns.some((pattern) => text.includes(pattern)) || status === 400 || status === 403 || status === 404) {
      return "definitive_failure";
    }
    return "definitive_failure";
  }
  return "ambiguous";
}

export function isAmbiguousOutcome(kind: TelegramSendKind): boolean {
  return kind === "timeout" || kind === "network" || kind === "ambiguous" || kind === "rate_limited";
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function telegramRequest(
  url: string,
  init: RequestInit,
  options: TelegramRequestOptions = {},
): Promise<TelegramSendResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      let body: Record<string, unknown> | null = null;
      try {
        body = await response.json() as Record<string, unknown>;
      } catch {
        body = null;
      }

      if (response.status === 429) {
        const retryAfterSec = Number((body as { parameters?: { retry_after?: number } } | null)?.parameters?.retry_after || 5);
        const retryAfterMs = Math.min(Math.max(retryAfterSec, 1) * 1000, MAX_RETRY_AFTER_MS);
        if (attempt < maxRetries) {
          await sleep(retryAfterMs);
          attempt += 1;
          continue;
        }
        return {
          kind: "rate_limited",
          status: 429,
          retryAfterMs,
          description: String((body as { description?: string } | null)?.description || "Too many requests"),
          body,
        };
      }

      if (response.ok) {
        return { kind: "success", status: response.status, body };
      }

      const description = String((body as { description?: string } | null)?.description || `HTTP ${response.status}`);
      return {
        kind: classifyTelegramFailure(response.status, description, false, false),
        status: response.status,
        description,
        body,
      };
    } catch (error) {
      const aborted = error instanceof Error && (error.name === "AbortError" || /aborted|timeout/i.test(error.message));
      const kind = classifyTelegramFailure(0, error instanceof Error ? error.message : "network", aborted, !aborted);
      if (attempt < maxRetries && (kind === "timeout" || kind === "network")) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
        attempt += 1;
        continue;
      }
      return {
        kind,
        status: 0,
        description: error instanceof Error ? error.message : "Network error",
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return { kind: "ambiguous", status: 0, description: "Exhausted retries" };
}

export function nextPollIndex(progress: { intro_sent?: boolean; polls_sent?: number[] } | null | undefined): number {
  const sent = Array.isArray(progress?.polls_sent) ? progress!.polls_sent! : [];
  if (sent.length === 0) return 0;
  return Math.max(...sent) + 1;
}

export function alreadySentPoll(progress: { polls_sent?: number[] } | null | undefined, index: number): boolean {
  return Array.isArray(progress?.polls_sent) && progress!.polls_sent!.includes(index);
}

export function alreadyAttemptedPoll(
  progress: { polls_sent?: number[]; polls_inflight?: number[] } | null | undefined,
  index: number,
): boolean {
  if (alreadySentPoll(progress, index)) return true;
  return Array.isArray(progress?.polls_inflight) && progress!.polls_inflight!.includes(index);
}

export function shouldSkipIntro(progress: { intro_sent?: boolean; intro_inflight?: boolean } | null | undefined): boolean {
  return Boolean(progress?.intro_sent || progress?.intro_inflight);
}

export async function persistWithRetry(
  write: () => Promise<boolean>,
  attempts = 5,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      if (await write()) return true;
    } catch {
      // retry
    }
    await sleep(Math.min(50 * 2 ** i, 800));
  }
  return false;
}
