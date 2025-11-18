import { supabase } from "@/integrations/supabase/client";
import {
  ChannelPost,
  CreateTextPost,
  CreateImagePost,
  CreatePollPost,
  CreatePDFPost,
  CreatePromotionalPost,
  CreateQuizPost,
  PostFilters,
  PostStatistics,
  PostTemplate,
  CreatePostTemplate,
  AccessibleChannel,
} from "@/types/post";

export class PostService {
  /**
   * Fetch posts with filters
   */
  static async fetchPosts(
    userId: string,
    filters?: PostFilters,
    limit: number = 50
  ): Promise<ChannelPost[]> {
    let query = supabase
      .from("channel_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (filters?.post_type) {
      query = query.eq("post_type", filters.post_type);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.channel_id) {
      query = query.eq("channel_id", filters.channel_id);
    }
    if (filters?.from_date) {
      query = query.gte("created_at", filters.from_date.toISOString());
    }
    if (filters?.to_date) {
      query = query.lte("created_at", filters.to_date.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to fetch posts");
    }

    return data || [];
  }

  /**
   * Get a single post by ID
   */
  static async getPost(postId: string): Promise<ChannelPost> {
    const { data, error } = await supabase
      .from("channel_posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (error) {
      throw new Error(error.message || "Failed to fetch post");
    }

    return data;
  }

  /**
   * Create a text post
   */
  static async createTextPost(
    userId: string,
    post: CreateTextPost
  ): Promise<ChannelPost> {
    const { data, error } = await supabase
      .from("channel_posts")
      .insert({
        user_id: userId,
        channel_id: post.channel_id,
        post_type: "text",
        title: post.title,
        content: post.content,
        parse_mode: post.parse_mode || "HTML",
        scheduled_time: post.scheduled_time?.toISOString(),
        status: post.scheduled_time ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create text post");
    }

    return data;
  }

  /**
   * Create an image post
   */
  static async createImagePost(
    userId: string,
    post: CreateImagePost
  ): Promise<ChannelPost> {
    // Upload image to Supabase Storage
    const fileExt = post.image_file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `channel-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("channel-media")
      .upload(filePath, post.image_file);

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload image");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("channel-media")
      .getPublicUrl(filePath);

    // Create post
    const { data, error } = await supabase
      .from("channel_posts")
      .insert({
        user_id: userId,
        channel_id: post.channel_id,
        post_type: "image",
        title: post.title,
        content: post.caption,
        media_url: urlData.publicUrl,
        media_storage_path: filePath,
        parse_mode: post.parse_mode || "HTML",
        scheduled_time: post.scheduled_time?.toISOString(),
        status: post.scheduled_time ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create image post");
    }

    return data;
  }

  /**
   * Create a poll post
   */
  static async createPollPost(
    userId: string,
    post: CreatePollPost
  ): Promise<ChannelPost> {
    const pollData = {
      question: post.question,
      options: post.options.map((text) => ({ text, voter_count: 0 })),
      is_anonymous: post.is_anonymous ?? true,
      allows_multiple_answers: post.allows_multiple_answers ?? false,
      correct_option_id: post.correct_option_id,
      explanation: post.explanation,
    };

    const { data, error } = await supabase
      .from("channel_posts")
      .insert({
        user_id: userId,
        channel_id: post.channel_id,
        post_type: "poll",
        poll_data: pollData,
        scheduled_time: post.scheduled_time?.toISOString(),
        status: post.scheduled_time ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create poll post");
    }

    return data;
  }

  /**
   * Create a PDF post
   */
  static async createPDFPost(
    userId: string,
    post: CreatePDFPost
  ): Promise<ChannelPost> {
    // Upload PDF to Supabase Storage
    const fileExt = post.pdf_file.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `channel-pdfs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("channel-media")
      .upload(filePath, post.pdf_file);

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload PDF");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("channel-media")
      .getPublicUrl(filePath);

    // Create post
    const { data, error } = await supabase
      .from("channel_posts")
      .insert({
        user_id: userId,
        channel_id: post.channel_id,
        post_type: "pdf",
        title: post.title,
        content: post.caption,
        media_url: urlData.publicUrl,
        media_storage_path: filePath,
        scheduled_time: post.scheduled_time?.toISOString(),
        status: post.scheduled_time ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create PDF post");
    }

    return data;
  }

  /**
   * Create a promotional post
   */
  static async createPromotionalPost(
    userId: string,
    post: CreatePromotionalPost
  ): Promise<ChannelPost> {
    const formattingOptions: any = {};
    if (post.button_url && post.button_text) {
      formattingOptions.inline_keyboard = [
        [{ text: post.button_text, url: post.button_url }],
      ];
    }

    const content = post.call_to_action
      ? `${post.content}\n\n${post.call_to_action}`
      : post.content;

    const { data, error } = await supabase
      .from("channel_posts")
      .insert({
        user_id: userId,
        channel_id: post.channel_id,
        post_type: "promotional",
        title: post.title,
        content: content,
        parse_mode: post.parse_mode || "HTML",
        formatting_options: formattingOptions,
        scheduled_time: post.scheduled_time?.toISOString(),
        status: post.scheduled_time ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create promotional post");
    }

    return data;
  }

  /**
   * Create a quiz post
   */
  static async createQuizPost(
    userId: string,
    post: CreateQuizPost
  ): Promise<ChannelPost> {
    const { data, error } = await supabase
      .from("channel_posts")
      .insert({
        user_id: userId,
        channel_id: post.channel_id,
        post_type: "quiz",
        quiz_data: post.quiz_data,
        scheduled_time: post.scheduled_time?.toISOString(),
        status: post.scheduled_time ? "scheduled" : "draft",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create quiz post");
    }

    return data;
  }

  /**
   * Update a post
   */
  static async updatePost(
    postId: string,
    updates: Partial<ChannelPost>
  ): Promise<ChannelPost> {
    const { data, error } = await supabase
      .from("channel_posts")
      .update(updates)
      .eq("id", postId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update post");
    }

    return data;
  }

  /**
   * Delete a post
   */
  static async deletePost(postId: string): Promise<void> {
    const { error } = await supabase
      .from("channel_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      throw new Error(error.message || "Failed to delete post");
    }
  }

  /**
   * Publish a draft post immediately
   */
  static async publishPost(postId: string): Promise<ChannelPost> {
    // Get the post
    const post = await this.getPost(postId);

    // Send to Telegram via edge function
    const { data, error } = await supabase.functions.invoke("send-channel-post", {
      body: { postId },
    });

    if (error) {
      // Update post status to failed
      await this.updatePost(postId, {
        status: "failed",
        error_message: error.message,
      });
      throw new Error(error.message || "Failed to publish post");
    }

    // Update post status
    return await this.updatePost(postId, {
      status: "published",
      sent_at: new Date().toISOString(),
      telegram_message_id: data.message_id,
    });
  }

  /**
   * Get post statistics
   */
  static async getStatistics(userId: string): Promise<PostStatistics> {
    const { data: posts, error } = await supabase
      .from("channel_posts")
      .select("post_type, status, view_count");

    if (error) {
      throw new Error(error.message || "Failed to fetch statistics");
    }

    const stats: PostStatistics = {
      total_posts: posts?.length || 0,
      by_type: {
        text: 0,
        image: 0,
        poll: 0,
        pdf: 0,
        promotional: 0,
        quiz: 0,
      },
      by_status: {
        draft: 0,
        scheduled: 0,
        published: 0,
        failed: 0,
      },
      total_views: 0,
      scheduled_posts: 0,
    };

    posts?.forEach((post) => {
      stats.by_type[post.post_type as keyof typeof stats.by_type]++;
      stats.by_status[post.status as keyof typeof stats.by_status]++;
      stats.total_views += post.view_count || 0;
    });

    stats.scheduled_posts = stats.by_status.scheduled;

    return stats;
  }

  /**
   * Get user's accessible channels
   */
  static async getAccessibleChannels(
    userId: string
  ): Promise<AccessibleChannel[]> {
    const { data, error } = await supabase.rpc("get_user_accessible_channels", {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(error.message || "Failed to fetch accessible channels");
    }

    return data || [];
  }

  /**
   * Template management
   */
  static async getTemplates(userId: string): Promise<PostTemplate[]> {
    const { data, error } = await supabase
      .from("post_templates")
      .select("*")
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to fetch templates");
    }

    return data || [];
  }

  static async createTemplate(
    userId: string,
    template: CreatePostTemplate
  ): Promise<PostTemplate> {
    const { data, error } = await supabase
      .from("post_templates")
      .insert({
        user_id: userId,
        ...template,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create template");
    }

    return data;
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from("post_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      throw new Error(error.message || "Failed to delete template");
    }
  }

  /**
   * Subscribe to real-time post updates
   */
  static subscribeToPostUpdates(
    userId: string,
    callback: (post: ChannelPost, eventType: "INSERT" | "UPDATE" | "DELETE") => void
  ) {
    const channel = supabase
      .channel(`channel_posts_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_posts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            callback(payload.new as ChannelPost, payload.eventType);
          } else if (payload.eventType === "DELETE") {
            callback(payload.old as ChannelPost, payload.eventType);
          }
        }
      )
      .subscribe();

    return channel;
  }
}
