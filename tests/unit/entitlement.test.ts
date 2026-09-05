import { describe, expect, it } from "vitest";
import { addDuration, amountsMatchPaise, durationFromBillingPeriod, isSuccessfulProviderStatus, nextPeriodEnd } from "../../supabase/functions/_shared/entitlement.ts";

describe("entitlement duration from purchased plan", () => {
  it("uses monthly duration for paid monthly plans", () => {
    const duration = durationFromBillingPeriod("monthly");
    expect(duration.days).toBe(30);
    expect(duration.billingPeriod).toBe("monthly");
  });

  it("uses yearly duration when the plan is yearly", () => {
    expect(durationFromBillingPeriod("yearly").days).toBe(365);
  });

  it("uses a 7-day trial window for trial plans", () => {
    expect(durationFromBillingPeriod("trial").days).toBe(7);
  });

  it("stacks renewal onto an already-active period", () => {
    const now = new Date("2026-01-15T00:00:00.000Z");
    const currentEnd = new Date("2026-02-01T00:00:00.000Z");
    const next = nextPeriodEnd({
      now,
      currentPeriodEnd: currentEnd,
      isActive: true,
      duration: durationFromBillingPeriod("monthly"),
    });
    expect(next.toISOString()).toBe(addDuration(currentEnd, durationFromBillingPeriod("monthly")).toISOString());
  });

  it("starts from now when the subscription is expired", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    const currentEnd = new Date("2026-02-01T00:00:00.000Z");
    const next = nextPeriodEnd({
      now,
      currentPeriodEnd: currentEnd,
      isActive: false,
      duration: durationFromBillingPeriod("monthly"),
    });
    expect(next.toISOString()).toBe(addDuration(now, durationFromBillingPeriod("monthly")).toISOString());
  });

  it("rejects mismatched amounts and non-captured provider statuses", () => {
    expect(amountsMatchPaise(2900, 9900)).toBe(false);
    expect(amountsMatchPaise(2900, 2900)).toBe(true);
    expect(isSuccessfulProviderStatus("captured")).toBe(true);
    expect(isSuccessfulProviderStatus("failed")).toBe(false);
    expect(isSuccessfulProviderStatus("authorized")).toBe(false);
  });
});
