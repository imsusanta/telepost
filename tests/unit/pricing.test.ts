import { describe, expect, it } from "vitest";
import type { SubscriptionPlan } from "../../src/services/subscriptionService";
import { getPlanPrice, getYearlyDiscountPercent } from "../../src/lib/pricing";

function plan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    id: "plan",
    name: "basic",
    display_name: "Basic",
    price: 199,
    yearly_price: 1999,
    billing_period: "monthly",
    max_telegram_channels: 5,
    max_pdf_storage_gb: 0,
    max_quizzes_per_month: 1000,
    max_batch_quiz_generation: 20,
    max_question_bank_size: 5000,
    max_questions_per_quiz: 50,
    max_kb_docs: 5,
    features: {
      create_quiz: {
        enabled: true,
        ai_generated: true,
        manual_input: true,
        question_bank: true,
        documents: true,
      },
      create_post: { enabled: true, write_with_ai: false },
      channels: true,
      stories: true,
      question_bank: {
        enabled: true,
        my_questions: true,
        ai_generate: false,
        pdf_generate: false,
      },
      knowledge_base: true,
      scheduler: true,
    },
    ...overrides,
  };
}

describe("pricing", () => {
  it("uses the configured monthly and yearly prices", () => {
    const basic = plan();
    expect(getPlanPrice(basic, "monthly")).toBe(199);
    expect(getPlanPrice(basic, "yearly")).toBe(1999);
    expect(getYearlyDiscountPercent(basic)).toBe(16);
  });

  it("falls back to twelve monthly payments when yearly pricing is missing", () => {
    const basic = plan({ yearly_price: 0 });
    expect(getPlanPrice(basic, "yearly")).toBe(2388);
    expect(getYearlyDiscountPercent(basic)).toBe(0);
  });

  it("keeps the free trial at zero for either toggle state", () => {
    const trial = plan({ price: 0, yearly_price: 0, billing_period: "trial" });
    expect(getPlanPrice(trial, "monthly")).toBe(0);
    expect(getPlanPrice(trial, "yearly")).toBe(0);
  });
});