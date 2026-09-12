import type { SubscriptionPlan } from "@/services/subscriptionService";

export type BillingPeriod = "monthly" | "yearly";

export function getPlanPrice(plan: SubscriptionPlan, billingPeriod: BillingPeriod): number {
  if (plan.price <= 0 || plan.billing_period === "trial") return 0;

  if (billingPeriod === "yearly") {
    const yearlyPrice = Number(plan.yearly_price);
    return Number.isFinite(yearlyPrice) && yearlyPrice > 0
      ? yearlyPrice
      : plan.price * 12;
  }

  return plan.price;
}

export function getYearlyDiscountPercent(plan: SubscriptionPlan): number {
  if (plan.price <= 0) return 0;

  const fullYearPrice = plan.price * 12;
  const yearlyPrice = getPlanPrice(plan, "yearly");
  if (yearlyPrice >= fullYearPrice) return 0;

  return Math.round(((fullYearPrice - yearlyPrice) / fullYearPrice) * 100);
}