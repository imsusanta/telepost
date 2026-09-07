import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeQuestions } from "../../supabase/functions/_shared/quiz.ts";

describe("quiz option parsing", () => {
  it("strips letter prefixes without using escaped-paren regex groups", () => {
    const source = readFileSync("supabase/functions/_shared/quiz.ts", "utf8");
    expect(source).not.toContain("\\(?");
    expect(source).toContain("^[(]?([a-dA-D1-4])[)]?");

    const questions = normalizeQuestions([
      {
        question: "What is the capital of India?",
        options: ["A) New Delhi", "B) Mumbai", "C) Kolkata", "D) Chennai"],
        correct: "A",
      },
    ], "en");

    expect(questions).toHaveLength(1);
    expect(questions[0].options).toEqual(["New Delhi", "Mumbai", "Kolkata", "Chennai"]);
    expect(questions[0].correct_option_index).toBe(0);
  });
});
