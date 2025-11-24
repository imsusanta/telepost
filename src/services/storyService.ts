import { supabase } from "@/integrations/supabase/client";

export interface TextOverlay {
  text: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  position: { x: number; y: number };
  align?: string;
}

export interface Sticker {
  emoji: string;
  position: { x: number; y: number };
  size?: number;
}

export interface Story {
  story_id: string;
  user_id: string;
  channel_id?: string | null;
  media_type: "image" | "video" | "text";
  media_url: string;
  caption?: string | null;
  text_overlay?: TextOverlay[];
  background_color?: string | null;
  template_id?: string | null;
  stickers?: Sticker[];
  duration_hours?: number | null;
  telegram_chat_id?: string | null;
  scheduled_time?: string | null;
  posted_at?: string | null;
  expires_at?: string | null;
  status: "draft" | "scheduled" | "posted" | "failed" | "expired" | "deleted";
  error_message?: string | null;
  view_count?: number | null;
  reach?: number | null;
  engagement_rate?: number | null;
  telegram_message_id?: string | null;
  is_highlight?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StoryTemplate {
  template_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  media_type: "image" | "video" | "text";
  background_color?: string | null;
  background_image_url?: string | null;
  default_text_overlay?: TextOverlay[];
  default_stickers?: Sticker[];
  preview_url?: string | null;
  is_public: boolean;
  created_by?: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateStoryData {
  channel_id?: string;
  media_type: "image" | "video" | "text";
  media_url?: string;
  caption?: string;
  text_overlay?: TextOverlay[];
  background_color?: string;
  template_id?: string;
  stickers?: Sticker[];
  duration_hours?: number;
  telegram_chat_id?: string;
  scheduled_time?: string;
  is_highlight?: boolean;
}

export class StoryService {
  /**
   * Upload story media file (image or video)
   */
  static async uploadStoryMedia(
    userId: string,
    file: File,
    mediaType: "image" | "video"
  ): Promise<string> {
    // Validate file type
    if (mediaType === "image" && !file.type.startsWith("image/")) {
      throw new Error("Invalid image file type");
    }
    if (mediaType === "video" && !file.type.startsWith("video/")) {
      throw new Error("Invalid video file type");
    }

    // Validate file size (10MB for images, 50MB for videos)
    const maxSize = mediaType === "image" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(
        `File size exceeds limit (${mediaType === "image" ? "10MB" : "50MB"})`
      );
    }

    // Create storage path
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storagePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage (story-media bucket)
    const { error: uploadError } = await supabase.storage
      .from("story-media")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("story-media")
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  }

  /**
   * Create a new story
   */
  static async createStory(
    userId: string,
    storyData: CreateStoryData
  ): Promise<Story> {
    // For text stories, media_url must be null to satisfy DB constraint
    // For image/video stories, media_url must have a value
    const mediaUrl = storyData.media_type === "text"
      ? null
      : (storyData.media_url || null);

    const { data, error } = await supabase
      .from("telegram_stories")
      .insert([{
        user_id: userId,
        channel_id: storyData.channel_id || null,
        media_type: storyData.media_type,
        media_url: mediaUrl as string,
        caption: storyData.caption,
        text_overlay: storyData.text_overlay as any || [],
        background_color: storyData.background_color,
        template_id: storyData.template_id,
        stickers: storyData.stickers as any || [],
        duration_hours: storyData.duration_hours ? storyData.duration_hours * 3600 : 86400,
        telegram_chat_id: storyData.telegram_chat_id,
        scheduled_time: storyData.scheduled_time,
        is_highlight: storyData.is_highlight || false,
        status: storyData.scheduled_time ? "scheduled" : "draft",
      }])
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      text_overlay: (data.text_overlay as any) || [],
      stickers: (data.stickers as any) || []
    } as Story;
  }

  /**
   * Update an existing story
   */
  static async updateStory(
    storyId: string,
    userId: string,
    updates: Partial<CreateStoryData>
  ): Promise<Story> {
    const { data, error } = await supabase
      .from("telegram_stories")
      .update(updates as any)
      .eq("story_id", storyId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      text_overlay: (data.text_overlay as any) || [],
      stickers: (data.stickers as any) || []
    } as Story;
  }

  /**
   * Get user's stories
   */
  static async getUserStories(
    userId: string,
    options?: {
      channelId?: string;
      status?: Story["status"];
      isHighlight?: boolean;
      limit?: number;
    }
  ): Promise<Story[]> {
    let query = supabase
      .from("telegram_stories")
      .select("*")
      .eq("user_id", userId);

    if (options?.channelId) {
      query = query.eq("channel_id", options.channelId);
    }

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    if (options?.isHighlight !== undefined) {
      query = query.eq("is_highlight", options.isHighlight);
    }

    query = query.order("created_at", { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(story => ({
      ...story,
      text_overlay: (story.text_overlay as any) || [],
      stickers: (story.stickers as any) || []
    })) as Story[];
  }

  /**
   * Get a single story by ID
   */
  static async getStory(storyId: string, userId: string): Promise<Story> {
    const { data, error } = await supabase
      .from("telegram_stories")
      .select("*")
      .eq("story_id", storyId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return {
      ...data,
      text_overlay: (data.text_overlay as any) || [],
      stickers: (data.stickers as any) || []
    } as Story;
  }

  /**
   * Delete a story
   */
  static async deleteStory(storyId: string, userId: string): Promise<void> {
    // Get story first
    const story = await this.getStory(storyId, userId);

    // Delete media file if exists
    if (story.media_url && story.media_url.includes("story-media")) {
      try {
        const urlParts = story.media_url.split("/story-media/");
        if (urlParts.length > 1) {
          const storagePath = urlParts[1].split("?")[0]; // Remove query params
          await supabase.storage.from("story-media").remove([storagePath]);
        }
      } catch (error) {
        console.error("Failed to delete media file:", error);
      }
    }

    // Delete story from database
    const { error } = await supabase
      .from("telegram_stories")
      .delete()
      .eq("story_id", storyId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Post a story immediately
   */
  static async postStoryNow(storyId: string): Promise<void> {
    const { error } = await supabase.functions.invoke("send-telegram-story", {
      body: {
        storyId,
        instantPost: true,
      },
    });

    if (error) throw error;
  }

  /**
   * Schedule a story for later posting
   */
  static async scheduleStory(
    storyId: string,
    userId: string,
    scheduledTime: string
  ): Promise<Story> {
    return this.updateStory(storyId, userId, {
      scheduled_time: scheduledTime,
      // @ts-ignore - status is not in CreateStoryData but valid for update
      status: "scheduled",
    });
  }

  /**
   * Get all story templates
   */
  static async getTemplates(category?: string): Promise<StoryTemplate[]> {
    let query = supabase
      .from("story_templates")
      .select("*")
      .eq("is_public", true);

    if (category) {
      query = query.eq("category", category);
    }

    query = query.order("usage_count", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(template => ({
      template_id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      media_type: template.media_type as "image" | "video" | "text",
      background_color: template.background_color,
      background_image_url: template.template_media_url,
      default_text_overlay: (template.default_text_overlay as any) || [],
      default_stickers: (template.default_stickers as any) || [],
      preview_url: template.template_media_url,
      is_public: template.is_public ?? true,
      created_by: template.created_by,
      usage_count: template.usage_count ?? 0,
      created_at: template.created_at ?? '',
      updated_at: template.updated_at ?? ''
    })) as StoryTemplate[];
  }

  /**
   * Create a story from template
   */
  static async createFromTemplate(
    userId: string,
    templateId: string,
    customizations?: Partial<CreateStoryData>
  ): Promise<Story> {
    // Get template
    const { data: template, error: templateError } = await supabase
      .from("story_templates")
      .select("*")
      .eq("template_id", templateId)
      .single();

    if (templateError) throw templateError;

    // Increment template usage count
    await supabase
      .from("story_templates")
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq("template_id", templateId);

    // Create story with template defaults
    return this.createStory(userId, {
      media_type: template.media_type as "image" | "video" | "text",
      background_color: template.background_color || undefined,
      text_overlay: (template.default_text_overlay as any) || [],
      stickers: (template.default_stickers as any) || [],
      template_id: templateId,
      ...customizations,
    });
  }

  /**
   * Get story analytics
   */
  static async getStoryAnalytics(storyId: string, userId: string): Promise<any> {
    // Verify ownership
    await this.getStory(storyId, userId);

    const { data, error } = await supabase
      .from("story_analytics")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Aggregate analytics
    const analytics = {
      total_views: 0,
      total_shares: 0,
      total_reactions: 0,
      total_clicks: 0,
      total_forwards: 0,
      events: data || [],
    };

    data?.forEach((event) => {
      switch (event.event_type) {
        case "view":
          analytics.total_views++;
          break;
        case "share":
          analytics.total_shares++;
          break;
        case "reaction":
          analytics.total_reactions++;
          break;
        case "click":
          analytics.total_clicks++;
          break;
        case "forward":
          analytics.total_forwards++;
          break;
      }
    });

    return analytics;
  }

  /**
   * Mark story as highlight
   */
  static async toggleHighlight(
    storyId: string,
    userId: string,
    isHighlight: boolean
  ): Promise<Story> {
    return this.updateStory(storyId, userId, {
      // @ts-ignore
      is_highlight: isHighlight,
    });
  }

  /**
   * Get active (non-expired) stories
   */
  static async getActiveStories(
    userId: string,
    channelId?: string
  ): Promise<Story[]> {
    const now = new Date().toISOString();

    let query = supabase
      .from("telegram_stories")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "posted")
      .or(`expires_at.gt.${now},is_highlight.eq.true`);

    if (channelId) {
      query = query.eq("channel_id", channelId);
    }

    query = query.order("posted_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(story => ({
      ...story,
      text_overlay: (story.text_overlay as any) || [],
      stickers: (story.stickers as any) || []
    })) as Story[];
  }

  /**
   * Get scheduled stories
   */
  static async getScheduledStories(
    userId: string,
    channelId?: string
  ): Promise<Story[]> {
    return this.getUserStories(userId, {
      channelId,
      status: "scheduled",
    });
  }

  /**
   * Get story highlights
   */
  static async getHighlights(
    userId: string,
    channelId?: string
  ): Promise<Story[]> {
    return this.getUserStories(userId, {
      channelId,
      isHighlight: true,
    });
  }
}
