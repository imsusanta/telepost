import { supabase } from "@/integrations/supabase/client";
import { StoryService } from "./storyService";

/**
 * Post represents a Telegram channel post (text and/or image)
 * This is a simplified wrapper around the Stories functionality
 */
export interface Post {
    id: string;
    user_id: string;
    channel_id: string | null;
    content: string;
    image_url: string | null;
    status: "draft" | "scheduled" | "posted" | "failed";
    scheduled_time: string | null;
    posted_at: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface CreatePostData {
    channel_id: string;
    content: string;
    image_url?: string;
    scheduled_time?: string;
}

export interface PostFilters {
    channelId?: string;
    status?: Post["status"];
    limit?: number;
}

/**
 * PostService provides a simplified interface for creating and managing
 * Telegram channel posts. Internally uses the Stories infrastructure.
 */
export class PostService {
    /**
     * Upload an image for a post
     */
    static async uploadPostImage(userId: string, file: File): Promise<string> {
        return StoryService.uploadStoryMedia(userId, file, "image");
    }

    /**
     * Create a new post (draft or scheduled)
     */
    static async createPost(
        userId: string,
        data: CreatePostData
    ): Promise<Post> {
        const mediaType = data.image_url ? "image" : "text";
        const status = data.scheduled_time ? "scheduled" : "draft";

        // Note: Database CHECK constraint allows media_url to be NULL for text posts
        // but TypeScript types incorrectly show it as required. Using type assertion.
        const insertData = {
            user_id: userId,
            channel_id: data.channel_id,
            media_type: mediaType,
            media_url: data.image_url || null,
            caption: data.content,
            status: status,
            scheduled_time: data.scheduled_time || null,
        } as {
            user_id: string;
            channel_id: string;
            media_type: string;
            media_url: string;
            caption: string;
            status: string;
            scheduled_time: string | null;
        };

        const { data: story, error } = await supabase
            .from("telegram_stories")
            .insert(insertData)
            .select()
            .single();

        if (error) {
            throw new Error(error.message || "Failed to create post");
        }

        return mapStoryToPost(story);
    }


    /**
     * Get user's posts with optional filters
     */
    static async getUserPosts(
        userId: string,
        filters?: PostFilters
    ): Promise<Post[]> {
        let query = supabase
            .from("telegram_stories")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (filters?.channelId) {
            query = query.eq("channel_id", filters.channelId);
        }

        if (filters?.status) {
            query = query.eq("status", filters.status);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message || "Failed to fetch posts");
        }

        return (data || []).map(mapStoryToPost);
    }

    /**
     * Get a single post by ID
     */
    static async getPost(postId: string, userId: string): Promise<Post> {
        const { data, error } = await supabase
            .from("telegram_stories")
            .select("*")
            .eq("story_id", postId)
            .eq("user_id", userId)
            .single();

        if (error) {
            throw new Error(error.message || "Post not found");
        }

        return mapStoryToPost(data);
    }

    /**
     * Update a post
     */
    static async updatePost(
        postId: string,
        userId: string,
        updates: Partial<CreatePostData>
    ): Promise<Post> {
        const updateData: Record<string, unknown> = {};

        if (updates.content !== undefined) {
            updateData.caption = updates.content;
        }

        if (updates.image_url !== undefined) {
            updateData.media_url = updates.image_url || null; // Must be null for text posts per DB constraint
            updateData.media_type = updates.image_url ? "image" : "text";
        }

        if (updates.scheduled_time !== undefined) {
            updateData.scheduled_time = updates.scheduled_time;
            updateData.status = updates.scheduled_time ? "scheduled" : "draft";
        }

        if (updates.channel_id !== undefined) {
            updateData.channel_id = updates.channel_id;
        }

        const { data, error } = await supabase
            .from("telegram_stories")
            .update(updateData)
            .eq("story_id", postId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            throw new Error(error.message || "Failed to update post");
        }

        return mapStoryToPost(data);
    }

    /**
     * Delete a post
     */
    static async deletePost(postId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from("telegram_stories")
            .delete()
            .eq("story_id", postId)
            .eq("user_id", userId);

        if (error) {
            throw new Error(error.message || "Failed to delete post");
        }
    }

    /**
     * Post immediately to Telegram
     */
    static async postNow(postId: string): Promise<void> {
        const { error } = await supabase.functions.invoke("send-telegram-story", {
            body: { storyId: postId, instantPost: true },
        });

        if (error) {
            throw new Error(error.message || "Failed to post to Telegram");
        }
    }

    /**
     * Schedule a post for later
     */
    static async schedulePost(
        postId: string,
        userId: string,
        scheduledTime: string
    ): Promise<Post> {
        const { data, error } = await supabase
            .from("telegram_stories")
            .update({
                status: "scheduled",
                scheduled_time: scheduledTime,
            })
            .eq("story_id", postId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            throw new Error(error.message || "Failed to schedule post");
        }

        return mapStoryToPost(data);
    }

    /**
     * Get post statistics for a user
     */
    static async getStatistics(userId: string): Promise<{
        total: number;
        draft: number;
        scheduled: number;
        posted: number;
        failed: number;
    }> {
        const [totalResult, draftResult, scheduledResult, postedResult, failedResult] =
            await Promise.all([
                supabase
                    .from("telegram_stories")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId),
                supabase
                    .from("telegram_stories")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "draft"),
                supabase
                    .from("telegram_stories")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "scheduled"),
                supabase
                    .from("telegram_stories")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "posted"),
                supabase
                    .from("telegram_stories")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "failed"),
            ]);

        return {
            total: totalResult.count || 0,
            draft: draftResult.count || 0,
            scheduled: scheduledResult.count || 0,
            posted: postedResult.count || 0,
            failed: failedResult.count || 0,
        };
    }
}

/**
 * Maps a telegram_stories row to a Post object
 */
function mapStoryToPost(story: Record<string, unknown>): Post {
    return {
        id: story.story_id as string,
        user_id: story.user_id as string,
        channel_id: story.channel_id as string | null,
        content: (story.caption as string) || "",
        image_url: story.media_type === "image" ? (story.media_url as string) : null,
        status: story.status as Post["status"],
        scheduled_time: story.scheduled_time as string | null,
        posted_at: story.posted_at as string | null,
        error_message: story.error_message as string | null,
        created_at: story.created_at as string,
        updated_at: story.updated_at as string | null,
    };
}
