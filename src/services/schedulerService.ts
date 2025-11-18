import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type ScheduledPost = Database["public"]["Tables"]["scheduled_telegram_posts"]["Row"];

export class SchedulerService {
  static async fetchScheduledPosts(): Promise<ScheduledPost[]> {
    const { data, error } = await supabase
      .from("scheduled_telegram_posts")
      .select("*")
      .order("scheduled_time", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to fetch scheduled posts");
    }

    return data || [];
  }

  static subscribeToScheduledPosts(callback: (post: ScheduledPost) => void) {
    const channel = supabase
      .channel("scheduled_posts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_telegram_posts",
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            callback(payload.new as ScheduledPost);
          }
        }
      )
      .subscribe();

    return channel;
  }
}
