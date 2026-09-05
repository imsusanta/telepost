import { describe, expect, it, vi } from "vitest";
import {
  alreadySentPoll,
  classifyTelegramFailure,
  isAmbiguousOutcome,
  nextPollIndex,
  telegramRequest,
} from "../../supabase/functions/_shared/telegram.ts";

describe("telegram send outcomes", () => {
  it("classifies rate limits, timeouts, and definitive failures", () => {
    expect(classifyTelegramFailure(429, "Too Many Requests", false, false)).toBe("rate_limited");
    expect(classifyTelegramFailure(0, "aborted", true, false)).toBe("timeout");
    expect(classifyTelegramFailure(400, "Bad Request: chat not found", false, false)).toBe("definitive_failure");
    expect(classifyTelegramFailure(500, "internal", false, false)).toBe("ambiguous");
    expect(isAmbiguousOutcome("timeout")).toBe(true);
    expect(isAmbiguousOutcome("definitive_failure")).toBe(false);
  });

  it("honors retry_after on 429 and then succeeds", async () => {
    const sleep = vi.fn(async () => {});
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ parameters: { retry_after: 2 }, description: "Too Many Requests" }), { status: 429 });
      }
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    });

    const result = await telegramRequest("https://api.telegram.org/botTEST/sendMessage", {
      method: "POST",
      body: "{}",
    }, { fetchImpl: fetchImpl as unknown as typeof fetch, sleep, timeoutMs: 1000 });

    expect(result.kind).toBe("success");
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("treats aborted requests as ambiguous timeouts rather than success", async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    });
    const result = await telegramRequest("https://api.telegram.org/botTEST/sendMessage", {
      method: "POST",
    }, { fetchImpl: fetchImpl as unknown as typeof fetch, maxRetries: 0, timeoutMs: 10, sleep: async () => {} });
    expect(result.kind).toBe("timeout");
    expect(isAmbiguousOutcome(result.kind)).toBe(true);
  });

  it("does not restart already-recorded successful polls", () => {
    const progress = { intro_sent: true, polls_sent: [0, 1] };
    expect(alreadySentPoll(progress, 0)).toBe(true);
    expect(alreadySentPoll(progress, 1)).toBe(true);
    expect(alreadySentPoll(progress, 2)).toBe(false);
    expect(nextPollIndex(progress)).toBe(2);
  });
});
