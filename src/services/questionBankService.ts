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
  difficulty: string;
  tags?: string[];
  source?: string;
  usage_count?: number;
  success_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankFilters {
  topic?: string;
  difficulty?: string;
  tags?: string[];
  channelId?: string;
}

export class QuestionBankService {
  /**
   * Add question to bank
   */
  static async addQuestion(
    userId: string,
    question: Omit<QuestionBankItem, "id" | "created_at" | "updated_at" | "times_used" | "times_correct" | "times_incorrect">
  ): Promise<QuestionBankItem> {
    const { data, error } = await supabase
      .from("question_banks")
      .insert({
        user_id: userId,
        ...question,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get questions from bank
   */
  static async getQuestions(
    userId: string,
    filters?: QuestionBankFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<QuestionBankItem[]> {
    let query = supabase
      .from("question_banks")
      .select("*")
      .eq("user_id", userId);

    // Apply filters
    if (filters?.topic) {
      query = query.eq("topic", filters.topic);
    }
    if (filters?.difficulty) {
      query = query.eq("difficulty", filters.difficulty);
    }
    if (filters?.channelId) {
      query = query.eq("channel_id", filters.channelId);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
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
    const allQuestions = await this.getQuestions(userId, filters, 1000);

    // Shuffle and take requested count
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Import questions from quiz
   */
  static async importQuestionsFromQuiz(
    userId: string,
    quizData: any,
    topic: string,
    options?: {
      channelId?: string;
    }
  ): Promise<QuestionBankItem[]> {
    const questions = quizData.questions.map((q: any) => ({
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
    return data || [];
  }

  /**
   * Import questions from document
   */
  static async importQuestionsFromDocument(
    userId: string,
    documentId: string,
    questions: any[],
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
    return data || [];
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
    return data;
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
   * Get question bank statistics
   */
  static async getStatistics(userId: string): Promise<{
    total: number;
    byTopic: Record<string, number>;
    byDifficulty: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from("question_banks")
      .select("topic, difficulty")
      .eq("user_id", userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      byTopic: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>,
    };

    data.forEach((q) => {
      // By topic
      stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;

      // By difficulty
      stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
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
