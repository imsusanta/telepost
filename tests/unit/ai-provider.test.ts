import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getAvailableFallbacks, providerError, resolveAIProvider } from "../../supabase/functions/_shared/ai-provider.ts";

describe("AI provider fallbacks", () => {
  it("includes Cloudflare as a fallback when settings carry Cloudflare credentials", () => {
    const settings = {
      provider: "openrouter" as const,
      model: "google/gemini-2.5-flash",
      temperature: 0.7,
      openrouter_api_key: "or-key",
      cloudflare_api_token: "cf-token",
      cloudflare_account_id: "cf-account",
    };
    const primary = resolveAIProvider(settings);
    expect(primary.provider).toBe("openrouter");

    const fallbacks = getAvailableFallbacks(settings, primary);
    expect(fallbacks[0]?.provider).toBe("cloudflare");
    expect(fallbacks[0]?.accountId).toBe("cf-account");
    expect(fallbacks.map((item) => item.provider)).toContain("cloudflare");
  });

  it("does not invent Cloudflare fallbacks from provider/model alone", () => {
    const settings = {
      provider: "openrouter" as const,
      model: "google/gemini-2.5-flash",
      temperature: 0.7,
      openrouter_api_key: "or-key",
    };
    const primary = resolveAIProvider(settings);
    const fallbacks = getAvailableFallbacks(
      { provider: primary.provider, model: primary.model, temperature: 0.7 },
      primary,
    );
    expect(fallbacks.map((item) => item.provider)).not.toContain("cloudflare");
  });

  it("redacts API keys from provider error messages", () => {
    const error = providerError(
      "gemini",
      403,
      JSON.stringify({ error: { message: "Permission denied: Consumer 'api_key:AIzaSyFakeSecretValueForTests123456' has been suspended." } }),
    );
    expect(error.message).toContain("api_key:[redacted]");
    expect(error.message).not.toContain("AIzaSyFakeSecretValueForTests123456");
  });
});

describe("generate-quiz live schema", () => {
  const source = readFileSync("supabase/functions/generate-quiz/index.ts", "utf8");

  it("saves quiz_data columns that exist in production", () => {
    expect(source).toContain("quiz_data: quizData");
    expect(source).toContain("source_type:");
    expect(source).toContain("language: effectiveLanguage");
    expect(source).toContain("settings: aiSettings");
    expect(source).not.toMatch(/insert\(\{[^}]*questions,/s);
  });
});
