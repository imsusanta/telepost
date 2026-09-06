export interface TelegramQuizQuestion {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

/**
 * Normalize one quiz question before it reaches Telegram.
 * The index always refers to the option array that will actually be sent.
 */
export function normalizeTelegramQuizQuestion(raw: TelegramQuizQuestion): TelegramQuizQuestion {
  const options = Array.isArray(raw.options) ? raw.options.map(cleanText).filter(Boolean).slice(0, 10) : [];
  if (options.length < 2) throw new Error("A Telegram quiz question must contain at least two options.");

  const index = Number(raw.correct_option_index);
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    throw new Error("Invalid correct_option_index for Telegram quiz question.");
  }

  return {
    question: cleanText(raw.question),
    options,
    correct_option_index: index,
    explanation: raw.explanation ? cleanText(raw.explanation) : undefined,
  };
}

/**
 * Randomly reorder options while preserving the correct answer by moving the
 * original correct option together with the answer index.
 * Use this only when the caller explicitly requests option shuffling.
 */
export function shuffleTelegramQuizOptions(question: TelegramQuizQuestion, random = Math.random): TelegramQuizQuestion {
  const normalized = normalizeTelegramQuizQuestion(question);
  const decorated = normalized.options.map((option, index) => ({
    option,
    isCorrect: index === normalized.correct_option_index,
  }));

  for (let i = decorated.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [decorated[i], decorated[j]] = [decorated[j], decorated[i]];
  }

  const shuffledOptions = decorated.map((item) => item.option);
  const correctIndex = decorated.findIndex((item) => item.isCorrect);
  if (correctIndex < 0) throw new Error("Correct answer was lost while shuffling options.");

  return {
    ...normalized,
    options: shuffledOptions,
    correct_option_index: correctIndex,
  };
}
