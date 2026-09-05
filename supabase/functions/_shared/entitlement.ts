export type BillingPeriod = "monthly" | "yearly" | "trial" | string;

export interface EntitlementDuration {
  billingPeriod: string;
  days: number;
  source: "plan" | "order_snapshot";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Paid plans in this product are modeled on subscription_plans.billing_period.
 * Current seed data: basic/pro = monthly, free = trial (7 days).
 * Yearly is supported if a plan row is stored with billing_period = 'yearly'.
 */
export function durationFromBillingPeriod(billingPeriod: BillingPeriod | null | undefined): EntitlementDuration {
  const period = String(billingPeriod || "monthly").toLowerCase();
  if (period === "yearly" || period === "year" || period === "annual") {
    return { billingPeriod: "yearly", days: 365, source: "plan" };
  }
  if (period === "trial") {
    return { billingPeriod: "trial", days: 7, source: "plan" };
  }
  return { billingPeriod: "monthly", days: 30, source: "plan" };
}

export function addDuration(from: Date, duration: EntitlementDuration): Date {
  const result = new Date(from.getTime());
  if (duration.billingPeriod === "yearly") {
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    return result;
  }
  if (duration.billingPeriod === "trial") {
    result.setUTCDate(result.getUTCDate() + 7);
    return result;
  }
  result.setUTCDate(result.getUTCDate() + 30);
  return result;
}

/**
 * Renewal: if the subscription is still active in the future, stack the
 * newly purchased period onto the current end. Otherwise start from now.
 */
export function nextPeriodEnd(input: {
  now: Date;
  currentPeriodEnd: Date | null;
  isActive: boolean;
  duration: EntitlementDuration;
}): Date {
  const baseline =
    input.isActive && input.currentPeriodEnd && input.currentPeriodEnd.getTime() > input.now.getTime()
      ? input.currentPeriodEnd
      : input.now;
  return addDuration(baseline, input.duration);
}

export function amountsMatchPaise(paidPaise: number, expectedPaise: number): boolean {
  return Number.isFinite(paidPaise) && Number.isFinite(expectedPaise) && paidPaise === expectedPaise;
}

export function isSuccessfulProviderStatus(status: string | null | undefined): boolean {
  return String(status || "").toLowerCase() === "captured";
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(Number(rupees) * 100);
}

export { DAY_MS };
