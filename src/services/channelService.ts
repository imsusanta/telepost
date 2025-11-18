import { supabase } from "@/integrations/supabase/client";

export interface TelegramChannel {
  id: string;
  user_id: string;
  channel_name: string;
  telegram_bot_token: string;
  telegram_channel_id: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  auto_post_enabled: boolean;
  auto_post_time?: string;
  total_quizzes_sent: number;
  last_quiz_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelInput {
  channel_name: string;
  telegram_bot_token: string;
  telegram_channel_id: string;
  description?: string;
  is_default?: boolean;
}

export interface UpdateChannelInput {
  channel_name?: string;
  telegram_bot_token?: string;
  telegram_channel_id?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  auto_post_enabled?: boolean;
  auto_post_time?: string;
}

export class ChannelService {
  /**
   * Get all channels for a user
   */
  static async getChannels(userId: string): Promise<TelegramChannel[]> {
    const { data, error } = await supabase
      .from("telegram_channels")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message || "Failed to fetch channels");
    }

    return data || [];
  }

  /**
   * Get active channels for a user
   */
  static async getActiveChannels(userId: string): Promise<TelegramChannel[]> {
    const { data, error } = await supabase
      .from("telegram_channels")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message || "Failed to fetch active channels");
    }

    return data || [];
  }

  /**
   * Get a specific channel by ID
   */
  static async getChannel(channelId: string): Promise<TelegramChannel | null> {
    const { data, error } = await supabase
      .from("telegram_channels")
      .select("*")
      .eq("id", channelId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Failed to fetch channel");
    }

    return data;
  }

  /**
   * Get the default channel for a user
   */
  static async getDefaultChannel(userId: string): Promise<TelegramChannel | null> {
    const { data, error } = await supabase
      .from("telegram_channels")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("is_default", true)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Failed to fetch default channel");
    }

    return data;
  }

  /**
   * Create a new channel
   */
  static async createChannel(
    userId: string,
    channelData: CreateChannelInput
  ): Promise<TelegramChannel> {
    const { data, error } = await supabase
      .from("telegram_channels")
      .insert({
        user_id: userId,
        ...channelData,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create channel");
    }

    return data;
  }

  /**
   * Update a channel
   */
  static async updateChannel(
    channelId: string,
    updates: UpdateChannelInput
  ): Promise<TelegramChannel> {
    const { data, error } = await supabase
      .from("telegram_channels")
      .update(updates)
      .eq("id", channelId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update channel");
    }

    return data;
  }

  /**
   * Delete a channel
   */
  static async deleteChannel(channelId: string): Promise<void> {
    const { error } = await supabase
      .from("telegram_channels")
      .delete()
      .eq("id", channelId);

    if (error) {
      throw new Error(error.message || "Failed to delete channel");
    }
  }

  /**
   * Set a channel as default
   */
  static async setDefaultChannel(
    userId: string,
    channelId: string
  ): Promise<TelegramChannel> {
    return this.updateChannel(channelId, { is_default: true });
  }

  /**
   * Increment quiz sent counter
   */
  static async incrementQuizCount(channelId: string): Promise<void> {
    const { error } = await supabase.rpc("increment_channel_quiz_count", {
      p_channel_id: channelId,
    });

    if (error) {
      // Fallback if RPC fails
      const channel = await this.getChannel(channelId);
      if (channel) {
        await this.updateChannel(channelId, {
          // @ts-ignore - total_quizzes_sent is not in UpdateChannelInput but exists in the table
          total_quizzes_sent: channel.total_quizzes_sent + 1,
        });
      }
    }
  }

  /**
   * Get channels for a specific document
   */
  static async getChannelsForDocument(documentId: string): Promise<TelegramChannel[]> {
    const { data, error } = await supabase
      .from("telegram_channels")
      .select("*, documents!inner(id)")
      .eq("documents.id", documentId);

    if (error) {
      throw new Error(error.message || "Failed to fetch channels for document");
    }

    return data || [];
  }

  /**
   * Get channel count for user (for subscription limit checks)
   */
  static async getChannelCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("telegram_channels")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new Error(error.message || "Failed to count channels");
    }

    return count || 0;
  }

  /**
   * Check if user can add more channels based on subscription
   */
  static async canAddChannel(userId: string): Promise<{
    canAdd: boolean;
    current: number;
    limit: number;
  }> {
    const currentCount = await this.getChannelCount(userId);

    // Get user's subscription plan
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subError) {
      throw new Error(subError.message || "Failed to fetch subscription");
    }

    const limit = subscription?.subscription_plans?.max_telegram_channels || 1;

    return {
      canAdd: currentCount < limit,
      current: currentCount,
      limit,
    };
  }
}
