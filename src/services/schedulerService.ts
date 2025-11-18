import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type ScheduledPost = Database["public"]["Tables"]["scheduled_telegram_posts"]["Row"];

export interface ScheduledPostFilters {
  status?: "pending" | "sent" | "failed";
  fromDate?: Date;
  toDate?: Date;
  channelId?: string;
}

export class SchedulerService {
  /**
   * Fetch scheduled posts for the current user
   */
  static async fetchScheduledPosts(
    userId: string,
    filters?: ScheduledPostFilters,
    limit: number = 100
  ): Promise<ScheduledPost[]> {
    try {
      let query = supabase
        .from("scheduled_telegram_posts")
        .select("*")
        .order("scheduled_time", { ascending: false })
        .limit(limit);

      // Try to filter by user_id if the column exists
      query = query.eq("user_id", userId);

      // Apply filters
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.fromDate) {
        query = query.gte("scheduled_time", filters.fromDate.toISOString());
      }
      if (filters?.toDate) {
        query = query.lte("scheduled_time", filters.toDate.toISOString());
      }
      if (filters?.channelId) {
        query = query.eq("chat_id", filters.channelId);
      }

      const { data, error } = await query;

      if (error) {
        // If the error is about missing user_id column, return empty array gracefully
        if (error.message?.includes("user_id") || error.message?.includes("does not exist")) {
          console.warn("Scheduler: user_id column not available, returning empty list");
          return [];
        }
        throw new Error(error.message || "Failed to fetch scheduled posts");
      }

      return data || [];
    } catch (error: any) {
      // Handle gracefully if the table/column doesn't exist
      if (error.message?.includes("does not exist") || error.message?.includes("user_id")) {
        console.warn("Scheduler service error:", error.message);
        return [];
      }
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for the current user's scheduled posts
   */
  static subscribeToScheduledPosts(
    userId: string,
    callback: (post: ScheduledPost, eventType: "INSERT" | "UPDATE" | "DELETE") => void
  ) {
    const channel = supabase
      .channel(`scheduled_posts_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_telegram_posts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            callback(payload.new as ScheduledPost, payload.eventType);
          } else if (payload.eventType === "DELETE") {
            callback(payload.old as ScheduledPost, payload.eventType);
          }
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Create a new scheduled post
   */
  static async createScheduledPost(
    userId: string,
    post: {
      chatId: string;
      quizData: any;
      scheduledTime: Date;
      minQuestionsPerInterval?: number;
    }
  ): Promise<ScheduledPost> {
    const { data, error } = await supabase
      .from("scheduled_telegram_posts")
      .insert({
        user_id: userId,
        chat_id: post.chatId,
        quiz_data: post.quizData,
        scheduled_time: post.scheduledTime.toISOString(),
        min_questions_per_interval: post.minQuestionsPerInterval || 1,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create scheduled post");
    }

    return data;
  }

  /**
   * Cancel a scheduled post
   */
  static async cancelScheduledPost(
    postId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("scheduled_telegram_posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", userId)
      .eq("status", "pending"); // Only allow canceling pending posts

    if (error) {
      throw new Error(error.message || "Failed to cancel scheduled post");
    }
  }

  /**
   * Get scheduled post statistics for a user
   */
  static async getStatistics(userId: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
  }> {
    try {
      const [totalResult, pendingResult, sentResult, failedResult] = await Promise.all([
        supabase
          .from("scheduled_telegram_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("scheduled_telegram_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "pending"),
        supabase
          .from("scheduled_telegram_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "sent"),
        supabase
          .from("scheduled_telegram_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "failed"),
      ]);

      // Check for errors related to missing columns
      const hasError = [totalResult, pendingResult, sentResult, failedResult].some(
        r => r.error?.message?.includes("user_id") || r.error?.message?.includes("does not exist")
      );

      if (hasError) {
        console.warn("Scheduler statistics: user_id column not available");
        return { total: 0, pending: 0, sent: 0, failed: 0 };
      }

      return {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        sent: sentResult.count || 0,
        failed: failedResult.count || 0,
      };
    } catch (error: any) {
      console.warn("Scheduler statistics error:", error.message);
      return { total: 0, pending: 0, sent: 0, failed: 0 };
    }
  }

  /**
   * Retry a failed scheduled post
   */
  static async retryFailedPost(
    postId: string,
    userId: string,
    newScheduledTime?: Date
  ): Promise<ScheduledPost> {
    const { data, error } = await supabase
      .from("scheduled_telegram_posts")
      .update({
        status: "pending",
        error_message: null,
        scheduled_time: newScheduledTime?.toISOString() || new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", userId)
      .eq("status", "failed")
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to retry scheduled post");
    }

    return data;
  }
}
