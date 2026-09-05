import { describe, expect, it } from "vitest";
import { secretsEqual, timingSafeEqual } from "../../supabase/functions/_shared/crypto.ts";

describe("timing-safe signature comparison", () => {
  it("accepts equal signatures", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
    expect(secretsEqual("secret", "secret")).toBe(true);
  });

  it("rejects invalid payment signatures", () => {
    expect(timingSafeEqual("valid-signature-value", "forged-signature-value")).toBe(false);
    expect(secretsEqual("order|pay", "order|other")).toBe(false);
  });

  it("rejects missing secrets instead of comparing empty strings", () => {
    expect(secretsEqual(null, "secret")).toBe(false);
    expect(secretsEqual("secret", null)).toBe(false);
    expect(secretsEqual("", "secret")).toBe(false);
  });
});
