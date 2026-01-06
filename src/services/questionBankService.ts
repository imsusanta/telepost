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
  difficulty: string;
  tags?: string[];
  source?: string;
  usage_count?: number;
  success_rate?: number;
  times_used: number;
  times_correct: number;
  times_incorrect: number;
  language: string;
  is_public: boolean;
  is_active: boolean;
  classification_confidence?: number;
  classification_source?: 'auto' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface QuestionBankFilters {
  topic?: string;
  difficulty?: string;
  language?: string;
  subject?: string;
  source?: string;
  tags?: string[];
  channelId?: string;
  includePublic?: boolean;
  unclassifiedOnly?: boolean;
}

export class QuestionBankService {
  /**
   * Bulk add questions to bank
   */
  static async bulkAddQuestions(
    userId: string,
    questions: Array<Omit<QuestionBankItem, "id" | "created_at" | "updated_at" | "times_used" | "times_correct" | "times_incorrect" | "user_id">>
  ): Promise<QuestionBankItem[]> {
    const formattedQuestions = questions.map(q => ({
      ...q,
      user_id: userId,
      topic: q.topic || "General",
      subject: q.subject || undefined,
      difficulty: q.difficulty || "medium",
      language: q.language || "bn",
      source: "bulk_upload"
    }));

    const { data, error } = await supabase
      .from("question_banks")
      .insert(formattedQuestions)
      .select();

    if (error) throw error;
    return (data || []) as QuestionBankItem[];
  }

  /**
   * Add question to bank
   */
  static async addQuestion(
    userId: string,
    question: Omit<QuestionBankItem, "id" | "created_at" | "updated_at" | "times_used" | "times_correct" | "times_incorrect" | "user_id">
  ): Promise<QuestionBankItem> {
    const { data, error } = await supabase
      .from("question_banks")
      .insert({
        ...question,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as QuestionBankItem;
  }

  /**
   * Get questions from bank with pagination and search
   */
  static async getQuestions(
    userId: string,
    filters?: QuestionBankFilters,
    limit: number = 20,
    offset: number = 0,
    search?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: QuestionBankItem[]; count: number }> {
    let query = supabase
      .from("question_banks")
      .select("*", { count: "exact" });

    // Handle user filtering with public questions option
    if (filters?.includePublic) {
      query = query.or(`user_id.eq.${userId},is_public.eq.true`);
    } else {
      query = query.eq("user_id", userId);
    }

    // Apply filters
    if (filters?.topic) {
      if (Array.isArray(filters.topic)) {
        query = query.in("topic", filters.topic);
      } else {
        query = query.eq("topic", filters.topic);
      }
    }
    if (filters?.subject) {
      if (Array.isArray(filters.subject)) {
        query = query.in("subject", filters.subject);
      } else {
        query = query.eq("subject", filters.subject);
      }
    }
    if (filters?.difficulty) {
      query = query.eq("difficulty", filters.difficulty);
    }
    if (filters?.language) {
      query = query.eq("language", filters.language);
    }
    if (filters?.source) {
      query = query.eq("source", filters.source);
    }
    if (filters?.channelId) {
      query = query.eq("channel_id", filters.channelId);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags);
    }
    if (filters?.unclassifiedOnly) {
      query = query.or("subject.is.null,subject.eq.\"\"");
    }

    // Apply search
    if (search?.trim()) {
      query = query.ilike("question", `%${search.trim()}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return {
      data: (data || []) as QuestionBankItem[],
      count: count || 0
    };
  }

  /**
   * Get random questions from bank
   */
  static async getRandomQuestions(
    userId: string,
    count: number,
    filters?: QuestionBankFilters
  ): Promise<QuestionBankItem[]> {
    // First, get all matching questions
    const { data: allQuestions } = await this.getQuestions(userId, filters, 1000);

    // Shuffle and take requested count
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Import questions from quiz
   */
  static async importQuestionsFromQuiz(
    userId: string,
    quizData: { questions: Array<{ question: string; options: string[]; correct_option_index: number; explanation?: string }>; metadata?: { difficulty?: string } },
    topic: string,
    options?: {
      channelId?: string;
    }
  ): Promise<QuestionBankItem[]> {
    const questions = quizData.questions.map((q) => ({
      user_id: userId,
      question: q.question,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation,
      topic: topic,
      difficulty: quizData.metadata?.difficulty || "medium",
      source: "quiz_import",
      channel_id: options?.channelId || null,
    }));

    const { data, error } = await supabase
      .from("question_banks")
      .insert(questions)
      .select();

    if (error) throw error;
    return (data || []) as QuestionBankItem[];
  }

  /**
   * Import questions from document
   */
  static async importQuestionsFromDocument(
    userId: string,
    _documentId: string,
    questions: Array<{ question: string; options: string[]; correct_option_index: number; explanation?: string; difficulty?: string }>,
    options?: {
      topic?: string;
      channelId?: string;
    }
  ): Promise<QuestionBankItem[]> {
    const questionRecords = questions.map((q) => ({
      user_id: userId,
      question: q.question,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation,
      topic: options?.topic || "General",
      difficulty: q.difficulty || "medium",
      source: "document",
      channel_id: options?.channelId || null,
    }));

    const { data, error } = await supabase
      .from("question_banks")
      .insert(questionRecords)
      .select();

    if (error) throw error;
    return (data || []) as QuestionBankItem[];
  }

  /**
   * Update question
   */
  static async updateQuestion(
    questionId: string,
    userId: string,
    updates: Partial<QuestionBankItem>
  ): Promise<QuestionBankItem> {
    const { data, error } = await supabase
      .from("question_banks")
      .update(updates)
      .eq("id", questionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data as QuestionBankItem;
  }

  /**
   * Delete question
   */
  static async deleteQuestion(questionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("question_banks")
      .delete()
      .eq("id", questionId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Bulk update classification for questions
   */
  static async bulkUpdateClassification(
    questionIds: string[],
    userId: string,
    subject: string,
    topic: string
  ): Promise<void> {
    const { error } = await supabase
      .from("question_banks")
      .update({ subject, topic })
      .in("id", questionIds)
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Get question bank statistics
   */
  static async getStatistics(userId: string): Promise<{
    total: number;
    byTopic: Record<string, number>;
    bySubject: Record<string, number>;
    byDifficulty: Record<string, number>;
    byLanguage: Record<string, number>;
    unclassifiedCount: number;
  }> {
    const { data, error } = await supabase
      .from("question_banks")
      .select("topic, subject, difficulty, language")
      .eq("user_id", userId);

    if (error) throw error;

    const questionsData = data as any[];

    const stats = {
      total: questionsData.length,
      byTopic: {} as Record<string, number>,
      bySubject: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      unclassifiedCount: 0,
    };

    questionsData.forEach((q) => {
      // By topic
      if (q.topic) stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;

      // By subject
      if (q.subject) {
        stats.bySubject[q.subject] = (stats.bySubject[q.subject] || 0) + 1;
      } else {
        stats.unclassifiedCount++;
      }

      // By difficulty
      stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;

      // By language
      if (q.language) {
        stats.byLanguage[q.language] = (stats.byLanguage[q.language] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Seed sample questions (for demo/testing)
   */
  static async seedSampleQuestions(userId: string): Promise<void> {
    const sampleQuestions = [
      {
        user_id: userId,
        question: "ভারতের রাজধানী কোথায়?",
        options: ["মুম্বাই", "দিল্লি", "কলকাতা", "চেন্নাই"],
        correct_option_index: 1,
        explanation: "ভারতের রাজধানী নতুন দিল্লি",
        topic: "Geography",
        difficulty: "easy",
        source: "sample",
      },
      {
        user_id: userId,
        question: "২ + ২ = ?",
        options: ["৩", "৪", "৫", "৬"],
        correct_option_index: 1,
        explanation: "২ + ২ = ৪",
        topic: "Mathematics",
        difficulty: "easy",
        source: "sample",
      },
    ];

    const { error } = await supabase
      .from("question_banks")
      .insert(sampleQuestions);

    if (error) throw error;
  }
}
