import { supabase } from "@/integrations/supabase/client";

/**
 * AI Service - all provider credentials are managed server-side by Supabase
 * Edge Function secrets. This service never reads or writes API keys.
 */

export interface TextGenerationOptions {
  prompt: string;
  tone: "professional" | "casual" | "motivational" | "fun";
  length: "short" | "medium" | "long";
  language: "english" | "bengali" | "hindi" | "mix";
  includeEmojis: boolean;
  includeHashtags: boolean;
  includeCTA: boolean;
  includeQuote: boolean;
}

export interface ImageGenerationOptions {
  prompt: string;
  style: "realistic" | "cartoon" | "minimalist" | "artistic";
  aspectRatio: "1:1" | "16:9" | "9:16";
  colorScheme: "vibrant" | "pastel" | "dark" | "auto";
}

export interface AISettings {
  hasApiKey: boolean;
  apiKeyStatus: "pending" | "active" | "invalid" | "expired";
  lastVerifiedAt: string | null;
}

export interface AIUsageStats {
  postsGeneratedToday: number;
  imagesGeneratedToday: number;
  totalCallsThisMonth: number;
  totalTokensThisMonth: number;
}

export interface GeneratedText {
  text: string;
  tokensUsed: number;
}

export interface GeneratedImage {
  imageUrl: string | null;
  generationTimeMs: number;
  enhancedPrompt?: string;
}

export class AIService {
  /** Legacy compatibility: provider credentials are no longer user-managed. */
  static async getSettings(): Promise<AISettings> {
    return { hasApiKey: false, apiKeyStatus: "pending", lastVerifiedAt: null };
  }

  /** API keys are intentionally not accepted or persisted by the client. */
  static async saveApiKey(_apiKey: string): Promise<void> {
    throw new Error("User-managed AI API keys are no longer supported. Configure the AI provider in Super Admin Settings and Supabase Edge Function secrets.");
  }

  static async testApiKey(): Promise<{ success: boolean; model: string; message: string }> {
    const { data, error } = await supabase.functions.invoke("test-ai-connection");
    if (error) throw new Error(error.message || "Failed to test AI connection");
    return data;
  }

  static async removeApiKey(): Promise<void> {
    throw new Error("User-managed AI API keys are no longer stored by TelePost.");
  }

  static async getUsageStats(): Promise<AIUsageStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    try {
      const { data, error } = await supabase.rpc("get_ai_usage_stats", { p_user_id: user.id });
      if (error) throw error;
      const stats = data as {
        posts_generated_today?: number;
        images_generated_today?: number;
        total_calls_this_month?: number;
        total_tokens_this_month?: number;
      } | null;
      return {
        postsGeneratedToday: stats?.posts_generated_today || 0,
        imagesGeneratedToday: stats?.images_generated_today || 0,
        totalCallsThisMonth: stats?.total_calls_this_month || 0,
        totalTokensThisMonth: stats?.total_tokens_this_month || 0,
      };
    } catch {
      return { postsGeneratedToday: 0, imagesGeneratedToday: 0, totalCallsThisMonth: 0, totalTokensThisMonth: 0 };
    }
  }

  static async generateText(options: TextGenerationOptions): Promise<GeneratedText> {
    const { data, error } = await supabase.functions.invoke("ai-generate-text", { body: options });
    if (error) throw new Error(error.message || "Failed to generate text");
    return { text: data.text, tokensUsed: data.tokensUsed || 0 };
  }

  static async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const { data, error } = await supabase.functions.invoke("ai-generate-image", { body: options });
    if (error) throw new Error(error.message || "Failed to generate image");
    return data;
  }

  static async generateCaption(imageData: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("ai-generate-caption", { body: { image: imageData } });
    if (error) throw new Error(error.message || "Failed to generate caption");
    return data.caption;
  }
}
