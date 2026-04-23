import { supabase } from "@/integrations/supabase/client";
import { Quiz, QuizConfig } from "@/types/quiz";

export class QuizService {
  static async generateQuiz(config: QuizConfig): Promise<Quiz> {
    // Verify we have an active session before invoking the function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // We already handle refresh internally in the Supabase client if configured, 
    // but explicit refresh here adds a safety layer against stale tokens.
    try {
      await supabase.auth.refreshSession();
    } catch (e) {
      console.warn("Auth refresh failed, attempting to continue anyway:", e);
    }

    if (sessionError || !session) {
      console.error("No active session when invoking generate-quiz function:", sessionError);
      throw new Error("Authentication session not available. Please try logging in again.");
    }

    // Use a promise race to implement a timeout on the function call
    // The edge function itself has inner timeouts, but this handles network hangs
    const fetchWithTimeout = async () => {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: config,
      });
      return { data, error };
    };

    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((_, reject) =>
      setTimeout(() => reject(new Error("Quiz generation timed out (client-side). Your quiz might still be generating, please check your dashboard in a moment.")), 60000)
    );

    let result;
    try {
      result = await Promise.race([fetchWithTimeout(), timeoutPromise]);
    } catch (err: any) {
      throw new Error(err.message || "Request timed out");
    }

    const { data, error } = result;

    if (error) {
      // Try to extract detailed error from response context
      let errorMessage = error.message || "Failed to generate quiz";

      // Check for specific HTTP status codes in the error
      if (error.message?.includes("429") || errorMessage.includes("Rate limit")) {
        throw new Error("Rate limit exceeded. Please wait 30 seconds and try again.");
      }
      if (error.message?.includes("402")) {
        throw new Error("AI quota exceeded. Please contact admin.");
      }
      if (error.message?.includes("504") || error.message?.includes("timeout")) {
        throw new Error("Request timed out. Try generating fewer questions.");
      }
      if (error.message?.includes("authorization") || error.message?.includes("401")) {
        throw new Error("Authentication failed. Please refresh the page and try again.");
      }

      throw new Error(errorMessage);
    }

    // Additional validation: check if data contains an error field
    if (data && typeof data === 'object' && 'error' in data) {
      const errorMsg = (data as { error?: string }).error || "Failed to generate quiz";

      // Check for specific error messages from the edge function
      if (errorMsg.includes("Rate limit") || errorMsg.includes("429")) {
        throw new Error(errorMsg);
      }
      if (errorMsg.includes("quota") || errorMsg.includes("402")) {
        throw new Error(errorMsg);
      }
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
    channelId?: string;
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

  static async testTelegramConnection(chatId: string, channelId?: string) {
    const { data, error } = await supabase.functions.invoke("test-telegram-connection", {
      body: { chatId, channelId },
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
