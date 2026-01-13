import { supabase } from "@/integrations/supabase/client";

/**
 * Post represents a Telegram channel post (text and/or image)
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
 * PostService provides interface for creating and managing Telegram channel posts
 * Uses the telegram_posts table
 */
export class PostService {
    /**
     * Upload an image for a post
     */
    static async uploadPostImage(userId: string, file: File): Promise<string> {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from("post-media")
            .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            // Try story-media bucket as fallback
            const { error: fallbackError } = await supabase.storage
                .from("story-media")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false,
                });

            if (fallbackError) {
                throw new Error(fallbackError.message || "Failed to upload image");
            }

            const { data: urlData } = supabase.storage
                .from("story-media")
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        }

        const { data: urlData } = supabase.storage
            .from("post-media")
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    }

    /**
     * Create a new post (draft or scheduled)
     */
    static async createPost(
        userId: string,
        data: CreatePostData
    ): Promise<Post> {
        const status = data.scheduled_time ? "scheduled" : "draft";

        const { data: post, error } = await supabase
            .from("telegram_posts")
            .insert({
                user_id: userId,
                channel_id: data.channel_id,
                content: data.content,
                image_url: data.image_url || null,
                status: status,
                scheduled_time: data.scheduled_time || null,
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message || "Failed to create post");
        }

        return mapDbToPost(post);
    }

    /**
     * Get user's posts with optional filters
     */
    static async getUserPosts(
        userId: string,
        filters?: PostFilters
    ): Promise<Post[]> {
        let query = supabase
            .from("telegram_posts")
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

        return (data || []).map(mapDbToPost);
    }

    /**
     * Get a single post by ID
     */
    static async getPost(postId: string, userId: string): Promise<Post> {
        const { data, error } = await supabase
            .from("telegram_posts")
            .select("*")
            .eq("id", postId)
            .eq("user_id", userId)
            .single();

        if (error) {
            throw new Error(error.message || "Post not found");
        }

        return mapDbToPost(data);
    }

    /**
     * Update a post
     */
    static async updatePost(
        postId: string,
        userId: string,
        updates: Partial<CreatePostData>
    ): Promise<Post> {
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.content !== undefined) {
            updateData.content = updates.content;
        }

        if (updates.image_url !== undefined) {
            updateData.image_url = updates.image_url || null;
        }

        if (updates.scheduled_time !== undefined) {
            updateData.scheduled_time = updates.scheduled_time;
            updateData.status = updates.scheduled_time ? "scheduled" : "draft";
        }

        if (updates.channel_id !== undefined) {
            updateData.channel_id = updates.channel_id;
        }

        const { data, error } = await supabase
            .from("telegram_posts")
            .update(updateData)
            .eq("id", postId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            throw new Error(error.message || "Failed to update post");
        }

        return mapDbToPost(data);
    }

    /**
     * Delete a post
     */
    static async deletePost(postId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from("telegram_posts")
            .delete()
            .eq("id", postId)
            .eq("user_id", userId);

        if (error) {
            throw new Error(error.message || "Failed to delete post");
        }
    }

    /**
     * Post immediately to Telegram
     */
    static async postNow(postId: string): Promise<void> {
        const { error } = await supabase.functions.invoke("send-telegram-post", {
            body: { postId, instantPost: true },
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
            .from("telegram_posts")
            .update({
                status: "scheduled",
                scheduled_time: scheduledTime,
                updated_at: new Date().toISOString(),
            })
            .eq("id", postId)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) {
            throw new Error(error.message || "Failed to schedule post");
        }

        return mapDbToPost(data);
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
                    .from("telegram_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId),
                supabase
                    .from("telegram_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "draft"),
                supabase
                    .from("telegram_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "scheduled"),
                supabase
                    .from("telegram_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", userId)
                    .eq("status", "posted"),
                supabase
                    .from("telegram_posts")
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
 * Maps a telegram_posts row to a Post object
 */
function mapDbToPost(row: Record<string, unknown>): Post {
    return {
        id: row.id as string,
        user_id: row.user_id as string,
        channel_id: row.channel_id as string | null,
        content: (row.content as string) || "",
        image_url: row.image_url as string | null,
        status: row.status as Post["status"],
        scheduled_time: row.scheduled_time as string | null,
        posted_at: row.posted_at as string | null,
        error_message: row.error_message as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string | null,
    };
}
