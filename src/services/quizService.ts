import { supabase } from "@/integrations/supabase/client";
import { Quiz, QuizConfig } from "@/types/quiz";

export class QuizService {
  static async generateQuiz(config: QuizConfig): Promise<Quiz> {
    // Verify we have an active session before invoking the function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("No active session when invoking generate-quiz function:", sessionError);
      throw new Error("Authentication session not available. Please try logging in again.");
    }

    const { data, error } = await supabase.functions.invoke("generate-quiz", {
      body: config,
    });

    if (error) {
      // Check if it's an auth error
      if (error.message?.includes("authorization") || error.message?.includes("401")) {
        throw new Error("Authentication failed. Please refresh the page and try again.");
      }
      throw new Error(error.message || "Failed to generate quiz");
    }

    // Additional validation: check if data contains an error field
    if (data && typeof data === 'object' && 'error' in data) {
      const errorMsg = (data as { error?: string }).error || "Failed to generate quiz";

      // Check for specific error messages from the edge function
      if (errorMsg.includes("authorization")) {
        throw new Error("Authentication error. Please log out and log back in.");
      }

      throw new Error(errorMsg);
    }

    // Validate that data has the required quiz structure
    if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("Invalid quiz data received from server");
    }

    return data as Quiz;
  }

  static async sendToTelegram(params: {
    chatId: string;
    quiz: Quiz;
    scheduleInterval?: number | null;
    instantPoll?: boolean;
  }) {
    const { data, error } = await supabase.functions.invoke("send-telegram-quiz", {
      body: params,
    });

    if (error) {
      throw new Error(error.message || "Failed to send quiz to Telegram");
    }

    return data;
  }

  static async testTelegramConnection(botToken: string, chatId: string) {
    const { data, error } = await supabase.functions.invoke("test-telegram-connection", {
      body: { botToken, chatId },
    });

    if (error) {
      throw new Error(error.message || "Failed to test Telegram connection");
    }

    return data;
  }

  static async generateQuizFromDocument(params: {
    documentText: string;
    topic?: string;
    questionCount: number;
    difficulty: string;
    language: string;
  }): Promise<Quiz> {
    // Verify we have an active session before invoking the function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("No active session when invoking generate-quiz-from-document function:", sessionError);
      throw new Error("Authentication session not available. Please try logging in again.");
    }

    const { data, error } = await supabase.functions.invoke("generate-quiz-from-document", {
      body: params,
    });

    if (error) {
      // Check if it's an auth error
      if (error.message?.includes("authorization") || error.message?.includes("401")) {
        throw new Error("Authentication failed. Please refresh the page and try again.");
      }
      throw new Error(error.message || "Failed to generate quiz from document");
    }

    // Additional validation: check if data contains an error field
    if (data && typeof data === 'object' && 'error' in data) {
      const errorMsg = (data as { error?: string }).error || "Failed to generate quiz from document";

      // Check for specific error messages from the edge function
      if (errorMsg.includes("authorization")) {
        throw new Error("Authentication error. Please log out and log back in.");
      }

      throw new Error(errorMsg);
    }

    // Validate that data has the required quiz structure
    if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error("Invalid quiz data received from server");
    }

    return data as Quiz;
  }
}
