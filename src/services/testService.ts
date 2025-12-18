import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Test = Tables<"tests">;
export type TestQuestion = Tables<"test_questions">;
export type TestAttempt = Tables<"test_attempts">;
export type QuestionBank = Tables<"question_banks">;

export interface TestWithQuestions extends Test {
  questions: (TestQuestion & { question_bank?: QuestionBank | null })[];
  question_count?: number;
  attempt_count?: number;
}

export interface TestAttemptWithAnswers extends TestAttempt {
  answers: {
    question_id: string;
    selected_index: number;
    is_correct: boolean;
    time_spent_seconds: number;
  }[];
}

export class TestService {
  static async getTests(): Promise<Test[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getTestById(testId: string): Promise<TestWithQuestions | null> {
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (testError) throw testError;
    if (!test) return null;

    const { data: questions, error: qError } = await supabase
      .from("test_questions")
      .select(`
        *,
        question_bank:question_banks(*)
      `)
      .eq("test_id", testId)
      .order("order_index");

    if (qError) throw qError;

    return {
      ...test,
      questions: questions || [],
    };
  }

  static async createTest(test: { title: string } & Partial<TablesInsert<"tests">>): Promise<Test> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const insertData: TablesInsert<"tests"> = {
      title: test.title,
      created_by: user.id,
      description: test.description,
      instructions: test.instructions,
      test_type: test.test_type,
      difficulty: test.difficulty,
      duration_minutes: test.duration_minutes,
      total_marks: test.total_marks,
      passing_marks: test.passing_marks,
      negative_marking: test.negative_marking,
      negative_marks_per_question: test.negative_marks_per_question,
      shuffle_questions: test.shuffle_questions,
      shuffle_options: test.shuffle_options,
      show_result_immediately: test.show_result_immediately,
      show_correct_answers: test.show_correct_answers,
      max_attempts: test.max_attempts,
    };

    const { data, error } = await supabase
      .from("tests")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateTest(testId: string, updates: Partial<Test>): Promise<Test> {
    const { data, error } = await supabase
      .from("tests")
      .update(updates)
      .eq("id", testId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteTest(testId: string): Promise<void> {
    const { error } = await supabase
      .from("tests")
      .delete()
      .eq("id", testId);

    if (error) throw error;
  }

  static async addQuestionsToTest(
    testId: string,
    questionBankIds: string[]
  ): Promise<void> {
    const questions = questionBankIds.map((qbId, index) => ({
      test_id: testId,
      question_bank_id: qbId,
      order_index: index,
      marks: 1,
    }));

    const { error } = await supabase
      .from("test_questions")
      .insert(questions);

    if (error) throw error;
  }

  static async addCustomQuestion(
    testId: string,
    question: {
      custom_question: string;
      custom_options: string[];
      custom_correct_index: number;
      custom_explanation?: string;
      marks?: number;
    }
  ): Promise<TestQuestion> {
    const { data: existing } = await supabase
      .from("test_questions")
      .select("order_index")
      .eq("test_id", testId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextIndex = existing && existing.length > 0 ? (existing[0].order_index || 0) + 1 : 0;

    const { data, error } = await supabase
      .from("test_questions")
      .insert({
        test_id: testId,
        custom_question: question.custom_question,
        custom_options: question.custom_options,
        custom_correct_index: question.custom_correct_index,
        custom_explanation: question.custom_explanation,
        marks: question.marks || 1,
        order_index: nextIndex,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async removeQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from("test_questions")
      .delete()
      .eq("id", questionId);

    if (error) throw error;
  }

  static async publishTest(testId: string): Promise<void> {
    const { error } = await supabase
      .from("tests")
      .update({ is_published: true, status: "active" })
      .eq("id", testId);

    if (error) throw error;
  }

  // Test attempt functions
  static async startAttempt(testId: string): Promise<TestAttempt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: test } = await supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (!test) throw new Error("Test not found");

    // Check existing attempts
    const { data: existingAttempts } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("test_id", testId)
      .eq("student_id", user.id);

    if (existingAttempts && existingAttempts.length >= (test.max_attempts || 1)) {
      throw new Error("Maximum attempts reached");
    }

    // Count questions
    const { count } = await supabase
      .from("test_questions")
      .select("*", { count: "exact", head: true })
      .eq("test_id", testId);

    const { data, error } = await supabase
      .from("test_attempts")
      .insert({
        test_id: testId,
        student_id: user.id,
        total_questions: count || 0,
        status: "in_progress",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async submitAttempt(
    attemptId: string,
    answers: { question_id: string; selected_index: number; time_spent_seconds: number }[]
  ): Promise<TestAttempt> {
    // Get the attempt and test
    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("*, tests(*)")
      .eq("id", attemptId)
      .single();

    if (!attempt) throw new Error("Attempt not found");

    // Get questions for evaluation
    const { data: questions } = await supabase
      .from("test_questions")
      .select("*, question_bank:question_banks(*)")
      .eq("test_id", attempt.test_id);

    if (!questions) throw new Error("Questions not found");

    // Evaluate answers
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = 0;
    let score = 0;

    const test = attempt.tests as unknown as Test;
    const evaluatedAnswers = answers.map((answer) => {
      const question = questions.find((q) => q.id === answer.question_id);
      if (!question) return { ...answer, is_correct: false };

      const correctIndex = question.question_bank_id
        ? question.question_bank?.correct_option_index
        : question.custom_correct_index;

      const isCorrect = answer.selected_index === correctIndex;

      if (answer.selected_index === -1) {
        skippedQuestions++;
      } else if (isCorrect) {
        correctAnswers++;
        score += question.marks || 1;
      } else {
        wrongAnswers++;
        if (test.negative_marking) {
          score -= test.negative_marks_per_question || 0;
        }
      }

      return { ...answer, is_correct: isCorrect };
    });

    const percentage = (score / (test.total_marks || 100)) * 100;
    const passed = percentage >= ((test.passing_marks || 40) / (test.total_marks || 100)) * 100;

    const { data, error } = await supabase
      .from("test_attempts")
      .update({
        submitted_at: new Date().toISOString(),
        time_taken_seconds: Math.floor((Date.now() - new Date(attempt.started_at || "").getTime()) / 1000),
        attempted_questions: answers.filter((a) => a.selected_index !== -1).length,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
        skipped_questions: skippedQuestions,
        score,
        percentage,
        passed,
        answers: evaluatedAnswers,
        status: "evaluated",
      })
      .eq("id", attemptId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getTestAttempts(testId: string): Promise<TestAttempt[]> {
    const { data, error } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("test_id", testId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getStudentAttempts(): Promise<TestAttempt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("test_attempts")
      .select("*, tests(*)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Analytics
  static async getTestAnalytics(testId: string) {
    const { data: attempts } = await supabase
      .from("test_attempts")
      .select("*")
      .eq("test_id", testId)
      .eq("status", "evaluated");

    if (!attempts || attempts.length === 0) {
      return {
        totalAttempts: 0,
        avgScore: 0,
        avgPercentage: 0,
        passRate: 0,
        topScore: 0,
        avgTimeMinutes: 0,
      };
    }

    const totalAttempts = attempts.length;
    const avgScore = attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / totalAttempts;
    const avgPercentage = attempts.reduce((sum, a) => sum + (Number(a.percentage) || 0), 0) / totalAttempts;
    const passRate = (attempts.filter((a) => a.passed).length / totalAttempts) * 100;
    const topScore = Math.max(...attempts.map((a) => Number(a.score) || 0));
    const avgTimeMinutes = attempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) / totalAttempts / 60;

    return {
      totalAttempts,
      avgScore: Math.round(avgScore * 100) / 100,
      avgPercentage: Math.round(avgPercentage * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      topScore,
      avgTimeMinutes: Math.round(avgTimeMinutes * 100) / 100,
    };
  }

  // Import from Question Bank
  static async getAvailableQuestions(): Promise<QuestionBank[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("question_banks")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Send to Telegram
  static async sendTestToTelegram(testId: string, chatId: string): Promise<void> {
    const test = await this.getTestById(testId);
    if (!test) throw new Error("Test not found");

    // Send each question as a Telegram quiz
    for (const question of test.questions) {
      const questionText = question.question_bank_id
        ? question.question_bank?.question
        : question.custom_question;

      const options = question.question_bank_id
        ? question.question_bank?.options
        : question.custom_options;

      const correctIndex = question.question_bank_id
        ? question.question_bank?.correct_option_index
        : question.custom_correct_index;

      const explanation = question.question_bank_id
        ? question.question_bank?.explanation
        : question.custom_explanation;

      const { error } = await supabase.functions.invoke("send-telegram-quiz", {
        body: {
          chatId,
          question: questionText,
          options: options,
          correctOptionId: correctIndex,
          explanation: explanation,
          isAnonymous: true,
        },
      });

      if (error) {
        console.error("Error sending quiz to Telegram:", error);
      }

      // Small delay between questions
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
