import { supabase } from "@/integrations/supabase/client";
import { Channel, CreateChannelRequest, UpdateChannelRequest, ChannelSettings } from "@/types/channel";

export class ChannelService {
  /**
   * Get all channels for a user
   */
  static async getUserChannels(userId: string): Promise<Channel[]> {
    const { data, error } = await supabase
      .from("channels")
      .select("id, user_id, name, telegram_channel_id, description, settings, last_auto_generated_at, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching channels:", error);
      throw new Error("Failed to fetch channels");
    }

    return (data || []).map(channel => ({
      ...channel,
      settings: channel.settings as unknown as ChannelSettings
    })) as Channel[];
  }

  /**
   * Get a single channel by ID
   */
  static async getChannel(channelId: string, userId: string): Promise<Channel> {
    const { data, error } = await supabase
      .from("channels")
      .select("id, user_id, name, telegram_channel_id, description, settings, last_auto_generated_at, created_at, updated_at")
      .eq("id", channelId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching channel:", error);
      throw new Error("Channel not found");
    }

    return {
      ...data,
      settings: data.settings as unknown as ChannelSettings
    } as Channel;
  }

  /**
   * Create a new channel
   */
  static async createChannel(
    userId: string,
    request: CreateChannelRequest
  ): Promise<Channel> {
    // Check user's channel limit
    const userChannels = await this.getUserChannels(userId);
    if (userChannels.length >= 10) {
      throw new Error("Channel limit reached");
    }

    // Default settings
    const defaultSettings: ChannelSettings = {
      auto_generate_quizzes: false,
      default_subject: "",
      default_difficulty: "medium",
      default_language: "en",
      questions_per_quiz: 10,
      generation_frequency: "daily",
      system_prompt: "",
    };

    const settings = { ...defaultSettings, ...request.settings };

    const { data, error } = await supabase
      .from("channels")
      .insert({
        user_id: userId,
        name: request.name,
        telegram_channel_id: request.telegram_channel_id,
        description: request.description,
        settings,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating channel:", error);
      throw new Error("Failed to create channel");
    }

    return {
      ...data,
      settings: data.settings as unknown as ChannelSettings
    } as Channel;
  }

  /**
   * Update a channel
   */
  static async updateChannel(
    channelId: string,
    userId: string,
    request: UpdateChannelRequest
  ): Promise<Channel> {
    // Get existing channel to merge settings
    const existingChannel = await this.getChannel(channelId, userId);

    const updates: Partial<{
      name: string;
      telegram_channel_id: string;
      description: string;
      settings: unknown;
    }> = {};

    if (request.name !== undefined) updates.name = request.name;
    if (request.telegram_channel_id !== undefined)
      updates.telegram_channel_id = request.telegram_channel_id;
    if (request.description !== undefined)
      updates.description = request.description;
    if (request.settings !== undefined) {
      updates.settings = { ...existingChannel.settings, ...request.settings } as unknown;
    }

    const { data, error } = await supabase
      .from("channels")
      .update(updates)
      .eq("id", channelId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating channel:", error);
      throw new Error("Failed to update channel");
    }

    return {
      ...data,
      settings: data.settings as unknown as ChannelSettings
    } as Channel;
  }

  /**
   * Delete a channel
   */
  static async deleteChannel(channelId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("channels")
      .delete()
      .eq("id", channelId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting channel:", error);
      throw new Error("Failed to delete channel");
    }
  }

  /**
   * Test Telegram connection for a channel
   * SECURITY: Bot token is stored server-side only
   */
  static async testTelegramConnection(
    chatId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "test-telegram-connection",
        {
          body: {
            chatId,
          },
        }
      );

      if (error) {
        console.error("Error testing Telegram connection:", error);
        return {
          success: false,
          message: error.message || "Failed to test connection",
        };
      }

      if (data?.success) {
        return {
          success: true,
          message: data.message || `Connected to ${data.chatInfo?.title || chatId}`,
        };
      } else {
        return {
          success: false,
          message: data?.error || "Failed to connect",
        };
      }
    } catch (error) {
      console.error("Error testing Telegram connection:", error);
      return {
        success: false,
        message: "Failed to test connection",
      };
    }
  }

  /**
   * Get channel statistics
   */
  static async getChannelStats(channelId: string, userId: string) {
    // Verify ownership
    await this.getChannel(channelId, userId);

    // Count documents
    const { count: documentCount } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("channel_id", channelId);

    // Count quizzes
    const { count: quizCount } = await supabase
      .from("quiz_generations")
      .select("*", { count: "exact", head: true })
      .eq("channel_id", channelId);

    // Count questions in question bank
    const { count: questionCount } = await supabase
      .from("question_banks")
      .select("*", { count: "exact", head: true })
      .eq("channel_id", channelId);

    // Calculate total storage used
    const { data: documents } = await supabase
      .from("documents")
      .select("file_size_bytes")
      .eq("channel_id", channelId);

    const totalStorage = documents?.reduce(
      (sum, doc) => sum + (doc.file_size_bytes || 0),
      0
    ) || 0;

    return {
      documentCount: documentCount || 0,
      quizCount: quizCount || 0,
      questionCount: questionCount || 0,
      totalStorageBytes: totalStorage,
    };
  }

  /**
   * Get channels that need auto quiz generation
   */
  static async getChannelsForAutoGeneration(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from("channels")
      .select("id, user_id, name, telegram_channel_id, description, settings, last_auto_generated_at, created_at, updated_at")
      .eq("settings->>auto_generate_quizzes", "true");

    if (error) {
      console.error("Error fetching channels for auto generation:", error);
      return [];
    }

    return (data || []).map(channel => ({
      ...channel,
      settings: channel.settings as unknown as ChannelSettings
    })) as Channel[];
  }

  /**
   * Trigger auto-generation for a specific channel
   */
  static async triggerAutoGeneration(
    channelId: string,
    forceGenerate: boolean = true
  ): Promise<{ success: boolean; message: string; quizId?: string }> {
    const { data, error } = await supabase.functions.invoke(
      "auto-generate-channel-quizzes",
      {
        body: {
          channelId,
          forceGenerate,
        },
      }
    );

    if (error) {
      console.error("Error triggering auto-generation:", error);
      throw new Error(error.message || "Failed to trigger auto-generation");
    }

    // Check results for the specific channel
    const channelResult = (data?.results as Array<{ channelId: string; success: boolean; quizId?: string; error?: string }>)?.find(
      (r) => r.channelId === channelId
    );

    if (channelResult?.success) {
      return {
        success: true,
        message: `Quiz generated successfully`,
        quizId: channelResult.quizId,
      };
    }

    return {
      success: false,
      message: channelResult?.error || data?.message || "Generation failed",
    };
  }

  /**
   * Get auto-generation status for a channel
   */
  static async getAutoGenerationStatus(channelId: string, userId: string) {
    // Get last quiz generation for the channel
    const { data: lastQuiz } = await supabase
      .from("quiz_generations")
      .select("created_at, topic, question_count")
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get channel settings
    const channel = await this.getChannel(channelId, userId);

    return {
      lastGeneratedAt: lastQuiz?.created_at || null,
      lastTopic: lastQuiz?.topic || null,
      lastQuestionCount: lastQuiz?.question_count || 0,
      isAutoGenerateEnabled: channel.settings.auto_generate_quizzes,
      generationFrequency: channel.settings.generation_frequency,
      systemPromptConfigured: !!channel.settings.system_prompt,
      telegramConfigured: !!channel.telegram_channel_id,
    };
  }
}
