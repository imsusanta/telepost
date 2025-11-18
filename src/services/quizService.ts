import { supabase } from "@/integrations/supabase/client";
import { Quiz, QuizConfig } from "@/types/quiz";

export class QuizService {
  static async generateQuiz(config: QuizConfig): Promise<Quiz> {
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: config,
      });

      if (error) {
        console.error("Quiz generation error:", error);
        throw new Error("Unable to generate quiz. Please try again.");
      }

      // Additional validation: check if data contains an error field
      if (data && typeof data === 'object' && 'error' in data) {
        console.error("Quiz generation returned error:", (data as any).error);
        throw new Error("Unable to generate quiz. Please try again.");
      }

      // Validate that data has the required quiz structure
      if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        console.error("Invalid quiz data received:", data);
        throw new Error("Unable to generate quiz. Invalid response from server.");
      }

      return data as Quiz;
    } catch (error: any) {
      if (error.message?.includes("Unable to generate")) {
        throw error;
      }
      console.error("Quiz generation failed:", error);
      throw new Error("Unable to generate quiz. Please check your connection.");
    }
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
}
