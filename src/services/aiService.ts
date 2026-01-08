import { supabase } from "@/integrations/supabase/client";

/**
 * AI Service - Handles AI-powered text and image generation
 * Proxies calls through Supabase Edge Functions to avoid CORS and protect keys
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
    /**
     * Get user's AI settings
     */
    static async getSettings(): Promise<AISettings> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from("user_ai_settings")
            .select("gemini_api_key_encrypted, api_key_status, last_verified_at")
            .eq("user_id", user.id)
            .single();

        if (error && error.code !== "PGRST116") {
            // If table doesn't exist yet, return default
            if (error.message?.includes("relation") && error.message?.includes("does not exist")) {
                return { hasApiKey: false, apiKeyStatus: "pending", lastVerifiedAt: null };
            }
            throw new Error(error.message);
        }

        return {
            hasApiKey: !!data?.gemini_api_key_encrypted,
            apiKeyStatus: (data?.api_key_status as AISettings["apiKeyStatus"]) || "pending",
            lastVerifiedAt: data?.last_verified_at || null,
        };
    }

    /**
     * Save user's API key
     */
    static async saveApiKey(apiKey: string): Promise<void> {
        const { error } = await supabase.functions.invoke("ai-save-api-key", {
            body: { apiKey },
        });

        if (error) {
            // Fallback for direct save if edge function fails
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error: dbError } = await supabase
                    .from("user_ai_settings")
                    .upsert({
                        user_id: user.id,
                        gemini_api_key_encrypted: apiKey,
                        api_key_status: "pending",
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id'
                    });
                if (dbError) throw new Error(dbError.message);
                return;
            }
            throw new Error(error.message || "Failed to save API key");
        }
    }

    /**
     * Test the user's API key
     */
    static async testApiKey(): Promise<{ success: boolean; model: string; message: string }> {
        const { data, error } = await supabase.functions.invoke("ai-test-connection");

        if (error) {
            throw new Error(error.message || "Failed to test connection via Edge Function");
        }

        return data;
    }

    /**
     * Remove user's API key
     */
    static async removeApiKey(): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase
            .from("user_ai_settings")
            .update({
                gemini_api_key_encrypted: null,
                api_key_status: "pending",
                last_verified_at: null,
            })
            .eq("user_id", user.id);

        if (error) throw new Error(error.message || "Failed to remove API key");
    }

    /**
     * Get AI usage statistics
     */
    static async getUsageStats(): Promise<AIUsageStats> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        try {
            const { data, error } = await supabase.rpc("get_ai_usage_stats", {
                p_user_id: user.id,
            });

            if (error) throw error;

            const stats = data as { posts_generated_today?: number; images_generated_today?: number; total_calls_this_month?: number; total_tokens_this_month?: number } | null;

            return {
                postsGeneratedToday: stats?.posts_generated_today || 0,
                imagesGeneratedToday: stats?.images_generated_today || 0,
                totalCallsThisMonth: stats?.total_calls_this_month || 0,
                totalTokensThisMonth: stats?.total_tokens_this_month || 0,
            };
        } catch {
            return {
                postsGeneratedToday: 0,
                imagesGeneratedToday: 0,
                totalCallsThisMonth: 0,
                totalTokensThisMonth: 0,
            };
        }
    }

    /**
     * Generate text content using AI via Edge Function
     */
    static async generateText(options: TextGenerationOptions): Promise<GeneratedText> {
        const { data, error } = await supabase.functions.invoke("ai-generate-text", {
            body: options,
        });

        if (error) throw new Error(error.message || "Failed to generate text");

        return {
            text: data.text,
            tokensUsed: data.tokensUsed || 0,
        };
    }

    /**
     * Generate enhanced image prompt using AI
     */
    static async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
        const { data, error } = await supabase.functions.invoke("ai-generate-image", {
            body: options,
        });

        if (error) throw new Error(error.message || "Failed to generate image prompt");

        return data;
    }

    /**
     * Generate caption for an image
     */
    static async generateCaption(imageData: string): Promise<string> {
        const { data, error } = await supabase.functions.invoke("ai-generate-caption", {
            body: { image: imageData },
        });

        if (error) throw new Error(error.message || "Failed to generate caption");

        return data.caption;
    }
}
