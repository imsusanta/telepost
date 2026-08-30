import { supabase } from "@/integrations/supabase/client";

export interface QuestionBankItem {
  id: string;
  user_id: string;
  channel_id?: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  topic: string;
  subject?: string;
  /** @deprecated Government-exam standard is automatic; do not use for new logic. */
  difficulty?: string;
  tags?: string[];
  source?: string;
  source_document_id?: string;
  usage_count?: number;
  success_rate?: number;
  times_used: number;
  times_correct: number;
  times_incorrect: number;
  language: string;
  is_public: boolean;
  is_active: boolean;
  classification_confidence?: number;
  classification_source?: "auto" | "manual";
  created_at: string;
  updated_at: string;
}

export interface QuestionBankFilters {
  topic?: string | string[];
  language?: string;
  subject?: string | string[];
  source?: string;
  tags?: string[];
  channelId?: string;
  includePublic?: boolean;
  isPublicOnly?: boolean;
  unclassifiedOnly?: boolean;
  /** @deprecated Ignored. Government-exam standard is automatic. */
  difficulty?: string;
}

export interface QuestionBankStatistics {
  total: number;
  byTopic: Record<string, number>;
  bySubject: Record<string, number>;
  byLanguage: Record<string, number>;
  unclassifiedCount: number;
  publicCount: number;
  privateCount: number;
}

type QuestionInput = Omit<QuestionBankItem, "id" | "created_at" | "updated_at" | "times_used" | "times_correct" | "times_incorrect" | "user_id">;

const stripLegacyDifficulty = <T extends Record<string, unknown>>(value: T): Omit<T, "difficulty"> => {
  const { difficulty: _ignored, ...clean } = value;
  return clean;
};

const normalizeQuestionInput = (question: Record<string, unknown>, source?: string): any => {
  const clean = stripLegacyDifficulty(question);
  return {
    ...clean,
    topic: typeof clean.topic === "string" && clean.topic.trim() ? clean.topic.trim() : "General",
    subject: typeof clean.subject === "string" && clean.subject.trim() ? clean.subject.trim() : null,
    language: typeof clean.language === "string" && clean.language.trim() ? clean.language : "bn",
    source: source ?? (typeof clean.source === "string" && clean.source ? clean.source : "manual"),
  };
};

function applyVisibility(query: any, userId: string, filters?: QuestionBankFilters) {
  if (filters?.isPublicOnly) return query.eq("is_public", true);
  if (filters?.includePublic) return query.or(`user_id.eq.${userId},is_public.eq.true`);
  return query.eq("user_id", userId);
}

function applyCommonFilters(query: any, filters?: QuestionBankFilters) {
  if (filters?.topic) query = Array.isArray(filters.topic) ? query.in("topic", filters.topic) : query.eq("topic", filters.topic);
  if (filters?.subject) query = Array.isArray(filters.subject) ? query.in("subject", filters.subject) : query.eq("subject", filters.subject);
  if (filters?.language) query = query.eq("language", filters.language);
  if (filters?.source) query = query.eq("source", filters.source);
  if (filters?.channelId && filters.channelId !== "all") query = query.eq("channel_id", filters.channelId);
  if (filters?.tags?.length) query = query.contains("tags", filters.tags);
  if (filters?.unclassifiedOnly) query = query.or('subject.is.null,subject.eq.""');
  return query;
}

export class QuestionBankService {
  static async bulkAddQuestions(userId: string, questions: QuestionInput[]): Promise<QuestionBankItem[]> {
    if (!questions.length) return [];
    const records = questions.map((question) => normalizeQuestionInput({ ...question, user_id: userId }, "bulk_upload"));
    const { data, error } = await supabase.from("question_banks").insert(records as any).select();
    if (error) throw error;
    return (data ?? []) as QuestionBankItem[];
  }

  static async addQuestion(userId: string, question: QuestionInput): Promise<QuestionBankItem> {
    const record = normalizeQuestionInput({ ...question, user_id: userId });
    const { data, error } = await supabase.from("question_banks").insert(record as any).select().single();
    if (error) throw error;
    return data as QuestionBankItem;
  }

  static async getQuestions(userId: string, filters: QuestionBankFilters = { includePublic: true }, limit = 20, offset = 0, search?: string, sortOrder: "asc" | "desc" = "desc"): Promise<{ data: QuestionBankItem[]; count: number }> {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safeOffset = Math.max(0, offset);
    let query = supabase.from("question_banks").select("*", { count: "exact" });
    query = applyVisibility(query, userId, filters);
    query = applyCommonFilters(query, filters);
    if (search?.trim()) query = query.ilike("question", `%${search.trim()}%`);
    const { data, error, count } = await query.order("created_at", { ascending: sortOrder === "asc" }).range(safeOffset, safeOffset + safeLimit - 1);
    if (error) throw error;
    return { data: (data ?? []) as QuestionBankItem[], count: count ?? 0 };
  }

  static async getQuestionsByIds(questionIds: string[]): Promise<QuestionBankItem[]> {
    if (!questionIds.length) return [];
    const { data, error } = await supabase.from("question_banks").select("*").in("id", questionIds);
    if (error) throw error;
    return (data ?? []) as QuestionBankItem[];
  }

  static async getQuestionIdsByRange(userId: string, fromPosition: number, toPosition: number, filters: QuestionBankFilters = { includePublic: true }, sortOrder: "asc" | "desc" = "desc"): Promise<string[]> {
    const from = Math.max(1, fromPosition);
    const to = Math.max(from, toPosition);
    const limit = Math.min(to - from + 1, 5000);
    let query = supabase.from("question_banks").select("id");
    query = applyVisibility(query, userId, filters);
    query = applyCommonFilters(query, filters);
    const { data, error } = await query.order("created_at", { ascending: sortOrder === "asc" }).range(from - 1, from - 1 + limit - 1);
    if (error) throw error;
    return (data ?? []).map((question) => question.id);
  }

  static async getRandomQuestions(userId: string, count: number, filters: QuestionBankFilters = { includePublic: true }): Promise<QuestionBankItem[]> {
    const safeCount = Math.max(1, Math.min(count, 100));
    const { data, error } = await supabase.rpc("get_random_question_bank_questions" as any, {
      p_user_id: userId,
      p_count: safeCount,
      p_subject: Array.isArray(filters.subject) ? null : filters.subject ?? null,
      p_topic: Array.isArray(filters.topic) ? null : filters.topic ?? null,
      p_language: filters.language ?? null,
      p_include_public: filters.isPublicOnly ? true : filters.includePublic !== false,
    });
    if (!error && data) return data as unknown as QuestionBankItem[];
    const { data: fallback } = await this.getQuestions(userId, filters, Math.max(100, safeCount * 5), 0);
    return [...fallback].sort(() => Math.random() - 0.5).slice(0, safeCount);
  }

  static async importQuestionsFromQuiz(userId: string, quizData: { questions: Array<{ question: string; options: string[]; correct_option_index: number; explanation?: string }> }, topic: string, options?: { channelId?: string }): Promise<QuestionBankItem[]> {
    const records = quizData.questions.map((question) => normalizeQuestionInput({ user_id: userId, question: question.question, options: question.options, correct_option_index: question.correct_option_index, explanation: question.explanation, topic, channel_id: options?.channelId ?? null }, "quiz_import"));
    if (!records.length) return [];
    const { data, error } = await supabase.from("question_banks").insert(records as any).select();
    if (error) throw error;
    return (data ?? []) as QuestionBankItem[];
  }

  static async importQuestionsFromDocument(userId: string, documentId: string, questions: Array<{ question: string; options: string[]; correct_option_index: number; explanation?: string }>, options?: { topic?: string; channelId?: string }): Promise<QuestionBankItem[]> {
    const records = questions.map((question) => normalizeQuestionInput({ user_id: userId, question: question.question, options: question.options, correct_option_index: question.correct_option_index, explanation: question.explanation, topic: options?.topic ?? "General", channel_id: options?.channelId ?? null, source_document_id: documentId }, "document"));
    if (!records.length) return [];
    const { data, error } = await supabase.from("question_banks").insert(records as any).select();
    if (error) throw error;
    return (data ?? []) as QuestionBankItem[];
  }

  static async updateQuestion(questionId: string, userId: string, updates: Partial<QuestionBankItem>): Promise<QuestionBankItem> {
    const clean = stripLegacyDifficulty({ ...updates } as Record<string, unknown>);
    delete (clean as any).id; delete (clean as any).user_id; delete (clean as any).created_at; delete (clean as any).updated_at;
    delete (clean as any).times_used; delete (clean as any).times_correct; delete (clean as any).times_incorrect;
    const { data, error } = await supabase.from("question_banks").update(clean).eq("id", questionId).eq("user_id", userId).select().single();
    if (error) throw error;
    return data as QuestionBankItem;
  }

  static async deleteQuestion(questionId: string, userId: string): Promise<void> {
    const { error } = await supabase.from("question_banks").delete().eq("id", questionId).eq("user_id", userId);
    if (error) throw error;
  }

  static async bulkUpdateClassification(questionIds: string[], userId: string, subject: string, topic: string): Promise<void> {
    if (!questionIds.length) return;
    const { error } = await supabase.from("question_banks").update({ subject: subject.trim(), topic: topic.trim() || "General", classification_source: "manual" }).in("id", questionIds).eq("user_id", userId);
    if (error) throw error;
  }

  static async getStatistics(userId: string, includePublic = false): Promise<QuestionBankStatistics> {
    const { data, error } = await supabase.rpc("question_bank_statistics" as any, { p_user_id: userId, p_include_public: includePublic });
    if (error) throw new Error(error.message || "Failed to load Question Bank statistics");
    if (!data || typeof data !== "object") throw new Error("Question Bank statistics returned an invalid response");
    const raw = data as Record<string, unknown>;
    return {
      total: Number(raw.total ?? 0),
      byTopic: (raw.byTopic && typeof raw.byTopic === "object" ? raw.byTopic : {}) as Record<string, number>,
      bySubject: (raw.bySubject && typeof raw.bySubject === "object" ? raw.bySubject : {}) as Record<string, number>,
      byLanguage: (raw.byLanguage && typeof raw.byLanguage === "object" ? raw.byLanguage : {}) as Record<string, number>,
      unclassifiedCount: Number(raw.unclassifiedCount ?? 0),
      publicCount: Number(raw.publicCount ?? 0),
      privateCount: Number(raw.privateCount ?? 0),
    };
  }

  static async seedSampleQuestions(userId: string): Promise<void> {
    await this.bulkAddQuestions(userId, [
      { question: "ভারতের রাজধানী কোথায়?", options: ["মুম্বাই", "নতুন দিল্লি", "কলকাতা", "চেন্নাই"], correct_option_index: 1, explanation: "ভারতের রাজধানী নতুন দিল্লি।", topic: "ভারতের ভূগোল", subject: "ভূগোল", language: "bn", is_public: false, is_active: true },
      { question: "২ + ২ = ?", options: ["৩", "৪", "৫", "৬"], correct_option_index: 1, explanation: "২ + ২ = ৪।", topic: "মৌলিক গণিত", subject: "গণিত", language: "bn", is_public: false, is_active: true },
    ] as QuestionInput[]);
  }
}
