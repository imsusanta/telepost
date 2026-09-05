/**
 * Shared helpers for quiz generation edge functions.
 *
 * Models rarely return the exact JSON shape we ask for: they wrap it in prose,
 * rename `correct_option_index`, answer with "B", use 1-based indexes, or get
 * cut off mid-array when the token budget runs out. Previously any of those
 * cases failed the whole request, which is why quiz generation appeared broken.
 */

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** Extract every plausible JSON object from a (possibly truncated) response. */
function salvageObjects(text: string): any[] {
  const results: any[] = [];
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < text.length; end++) {
      const character = text[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') { inString = true; continue; }
      if (character === '{') depth++;
      else if (character === '}') {
        depth--;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(text.slice(start, end + 1));
            if (parsed && (parsed.question || parsed.text || parsed.q)) results.push(parsed);
          } catch {
            // Ignore fragments that are not valid JSON on their own.
          }
          start = end;
          break;
        }
      }
    }
  }
  return results;
}

/** Pull the raw question list out of whatever the model returned. */
export function parseQuizPayload(text: string): any[] {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const candidates: string[] = [cleaned];

  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(cleaned.slice(objectStart, objectEnd + 1));

  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const list = Array.isArray(parsed)
        ? parsed
        : parsed?.questions || parsed?.quiz || parsed?.mcqs || parsed?.data || parsed?.items;
      if (Array.isArray(list) && list.length) return list;
    } catch {
      // Fall through to the salvage path below.
    }
  }

  return salvageObjects(cleaned);
}

function extractOptions(raw: any): string[] {
  const source = raw?.options ?? raw?.choices ?? raw?.answers ?? raw?.option_list;
  let values: unknown[] = [];

  if (Array.isArray(source)) values = source;
  else if (source && typeof source === 'object') values = Object.keys(source).sort().map((key) => (source as any)[key]);

  return values
    .map((value) => {
      if (value && typeof value === 'object') {
        return asText((value as any).text ?? (value as any).option ?? (value as any).value ?? (value as any).label);
      }
      return asText(value);
    })
    .map((value) => value.replace(/^[(]?([a-dA-D1-4])[)]?[).:-]\s+/, '').trim())
    .filter(Boolean);
}

function extractCorrectIndex(raw: any, options: string[]): number {
  const candidates = [
    raw?.correct_option_index, raw?.correctOptionIndex, raw?.correct_index, raw?.correctIndex,
    raw?.answer_index, raw?.answerIndex, raw?.correct_answer_index,
    raw?.correct, raw?.answer, raw?.correct_answer, raw?.correctAnswer, raw?.correct_option,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') continue;

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      const value = Math.trunc(candidate);
      if (value >= 0 && value < options.length) return value;
      if (value >= 1 && value <= options.length) return value - 1;
      continue;
    }

    const text = asText(candidate);
    if (!text) continue;

    const letterMatch = text.match(/^[(]?([a-dA-D])[)]?$/);
    if (letterMatch) {
      const index = letterMatch[1].toLowerCase().charCodeAt(0) - 97;
      if (index >= 0 && index < options.length) return index;
    }

    if (/^\d+$/.test(text)) {
      const value = Number(text);
      if (value >= 0 && value < options.length) return value;
      if (value >= 1 && value <= options.length) return value - 1;
    }

    const matchedOption = options.findIndex((option) => option.toLowerCase() === text.toLowerCase());
    if (matchedOption >= 0) return matchedOption;
  }

  return -1;
}

const BENGALI = /[\u0980-\u09FF]/g;
const DEVANAGARI = /[\u0900-\u097F]/g;
const LATIN = /[a-zA-Z]/g;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length;
}

/**
 * Relaxed language check.
 *
 * The old check rejected any question containing a single Latin character, so
 * normal Bengali questions with "GDP", "km" or "IPL" were thrown away, and the
 * Devanagari danda (U+0964) used in Bengali text counted as "foreign script".
 * Now we only require the target script to dominate.
 */
export function matchesLanguage(question: QuizQuestion, language: string): boolean {
  if (language !== 'bn' && language !== 'hi') return true;

  const text = [question.question, ...question.options, question.explanation || ''].join(' ');
  const latin = countMatches(text, LATIN);
  const target = language === 'bn' ? countMatches(text, BENGALI) : countMatches(text, DEVANAGARI);

  if (target === 0) return false;
  // Allow acronyms and units, but reject answers written mostly in English.
  return latin <= target;
}

export function normalizeQuestions(rawList: any[], language: string): QuizQuestion[] {
  const normalized: QuizQuestion[] = [];

  for (const raw of rawList || []) {
    const questionText = asText(raw?.question ?? raw?.text ?? raw?.q ?? raw?.title);
    if (!questionText) continue;

    const options = extractOptions(raw);
    if (options.length < 4) continue;
    const fourOptions = options.slice(0, 4);

    const correctIndex = extractCorrectIndex(raw, fourOptions);
    if (correctIndex < 0 || correctIndex > 3) continue;

    const question: QuizQuestion = {
      id: normalized.length + 1,
      question: questionText,
      options: fourOptions,
      correct_option_index: correctIndex,
      explanation: asText(raw?.explanation ?? raw?.reason ?? raw?.rationale) || undefined,
    };

    if (!matchesLanguage(question, language)) continue;
    normalized.push(question);
  }

  return normalized;
}

/** Merge new questions into the collected set, skipping near-duplicates. */
export function appendUnique(collected: QuizQuestion[], incoming: QuizQuestion[], limit: number): void {
  const seen = new Set(collected.map((question) => question.question.replace(/\s+/g, ' ').trim().toLowerCase()));

  for (const question of incoming) {
    if (collected.length >= limit) return;
    const key = question.question.replace(/\s+/g, ' ').trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    collected.push({ ...question, id: collected.length + 1 });
  }
}

/** Split a requested question count into batches the model can reliably return. */
export function planBatches(count: number, batchSize = 10): number[] {
  const batches: number[] = [];
  let remaining = Math.max(1, count);
  while (remaining > 0) {
    const size = Math.min(batchSize, remaining);
    batches.push(size);
    remaining -= size;
  }
  return batches;
}

/** Token budget for a batch: enough room for Bengali/Hindi output plus JSON overhead. */
export function tokenBudget(batchSize: number): number {
  return Math.min(8192, 800 + batchSize * 420);
}
