import { supabase } from "@/integrations/supabase/client";
import { Quiz, QuizConfig } from "@/types/quiz";

export class QuizService {
  static async generateQuiz(config: QuizConfig): Promise<Quiz> {
    const { data, error } = await supabase.functions.invoke("generate-quiz", {
      body: config,
    });

    if (error) {
      throw new Error(error.message || "Failed to generate quiz");
    }

    // Additional validation: check if data contains an error field
    if (data && typeof data === 'object' && 'error' in data) {
      throw new Error((data as any).error || "Failed to generate quiz");
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
}
