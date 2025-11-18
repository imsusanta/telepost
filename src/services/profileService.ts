import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export class ProfileService {
  static async fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Failed to fetch profile");
    }

    return data;
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update profile");
    }

    return data;
  }

  static async saveTelegramConfig(userId: string, botToken: string, channelId: string): Promise<Profile> {
    return this.updateProfile(userId, {
      telegram_bot_token: botToken,
      telegram_channel_id: channelId,
    });
  }
}
