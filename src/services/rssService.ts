import { supabase } from "@/integrations/supabase/client";
import {
  RssFeedSource,
  RssFeedItem,
  RssFeedStatistics,
  RssProcessingLog,
  CreateRssFeedRequest,
  UpdateRssFeedRequest,
  RssFeedPreview,
} from "@/types/rss";

export class RssService {
  /**
   * Fetch all RSS feeds for a user
   */
  static async getUserRssFeeds(userId: string): Promise<RssFeedSource[]> {
    const { data, error } = await supabase
      .from("rss_feed_sources")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to fetch RSS feeds");
    }

    return data || [];
  }

  /**
   * Fetch RSS feeds for a specific channel
   */
  static async getChannelRssFeeds(channelId: string): Promise<RssFeedSource[]> {
    const { data, error } = await supabase
      .from("rss_feed_sources")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to fetch channel RSS feeds");
    }

    return data || [];
  }

  /**
   * Get RSS feed by ID
   */
  static async getRssFeedById(feedId: string): Promise<RssFeedSource | null> {
    const { data, error } = await supabase
      .from("rss_feed_sources")
      .select("*")
      .eq("id", feedId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(error.message || "Failed to fetch RSS feed");
    }

    return data;
  }

  /**
   * Create a new RSS feed
   */
  static async createRssFeed(
    userId: string,
    request: CreateRssFeedRequest
  ): Promise<RssFeedSource> {
    const { data, error } = await supabase
      .from("rss_feed_sources")
      .insert({
        user_id: userId,
        channel_id: request.channel_id,
        feed_url: request.feed_url,
        post_frequency: request.post_frequency || "daily",
        custom_interval_minutes: request.custom_interval_minutes || null,
        filters: request.filters || {},
        settings: request.settings || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to create RSS feed");
    }

    return data;
  }

  /**
   * Update an existing RSS feed
   */
  static async updateRssFeed(
    feedId: string,
    request: UpdateRssFeedRequest
  ): Promise<RssFeedSource> {
    const { data, error } = await supabase
      .from("rss_feed_sources")
      .update(request)
      .eq("id", feedId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update RSS feed");
    }

    return data;
  }

  /**
   * Delete an RSS feed
   */
  static async deleteRssFeed(feedId: string): Promise<void> {
    const { error } = await supabase
      .from("rss_feed_sources")
      .delete()
      .eq("id", feedId);

    if (error) {
      throw new Error(error.message || "Failed to delete RSS feed");
    }
  }

  /**
   * Toggle RSS feed active status
   */
  static async toggleRssFeedActive(
    feedId: string,
    isActive: boolean
  ): Promise<RssFeedSource> {
    const { data, error } = await supabase
      .from("rss_feed_sources")
      .update({ is_active: isActive })
      .eq("id", feedId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to toggle RSS feed status");
    }

    return data;
  }

  /**
   * Fetch RSS feed items for a specific feed
   */
  static async getFeedItems(
    feedId: string,
    limit: number = 50
  ): Promise<RssFeedItem[]> {
    const { data, error } = await supabase
      .from("rss_feed_items")
      .select("*")
      .eq("feed_id", feedId)
      .order("published_date", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message || "Failed to fetch feed items");
    }

    return data || [];
  }

  /**
   * Get RSS feed statistics
   */
  static async getFeedStatistics(
    userId: string
  ): Promise<RssFeedStatistics[]> {
    const { data, error } = await supabase
      .from("rss_feed_statistics")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message || "Failed to fetch feed statistics");
    }

    return data || [];
  }

  /**
   * Get RSS feed statistics for a specific feed
   */
  static async getFeedStatisticsById(
    feedId: string
  ): Promise<RssFeedStatistics | null> {
    const { data, error } = await supabase
      .from("rss_feed_statistics")
      .select("*")
      .eq("feed_id", feedId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(error.message || "Failed to fetch feed statistics");
    }

    return data;
  }

  /**
   * Get processing logs for a feed
   */
  static async getFeedLogs(
    feedId: string,
    limit: number = 20
  ): Promise<RssProcessingLog[]> {
    const { data, error } = await supabase
      .from("rss_processing_log")
      .select("*")
      .eq("feed_id", feedId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message || "Failed to fetch feed logs");
    }

    return data || [];
  }

  /**
   * Validate and preview RSS feed
   */
  static async previewRssFeed(feedUrl: string): Promise<RssFeedPreview> {
    try {
      // Use a CORS proxy or backend endpoint to fetch RSS feed
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Quiz-Genie-Bot/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`);
      }

      const xml = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");

      // Check for parsing errors
      const parserError = doc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid RSS feed format");
      }

      // Extract feed information
      const feedTitle = doc.querySelector("channel > title")?.textContent || "Unknown Feed";
      const feedDescription = doc.querySelector("channel > description")?.textContent || "";

      // Extract items
      const items = Array.from(doc.querySelectorAll("item"))
        .slice(0, 5)
        .map((item) => ({
          title: item.querySelector("title")?.textContent || "No title",
          description: item.querySelector("description")?.textContent || "",
          link: item.querySelector("link")?.textContent || "",
          published_date: item.querySelector("pubDate")?.textContent || "",
        }));

      return {
        feed_title: feedTitle,
        feed_description: feedDescription,
        items,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to preview RSS feed"
      );
    }
  }

  /**
   * Manually trigger RSS feed processing
   */
  static async triggerFeedProcessing(feedId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("process-rss-feeds", {
      body: { feed_id: feedId },
    });

    if (error) {
      throw new Error(error.message || "Failed to trigger feed processing");
    }
  }

  /**
   * Retry failed RSS item
   */
  static async retryFailedItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from("rss_feed_items")
      .update({ status: "pending", error_message: null })
      .eq("id", itemId);

    if (error) {
      throw new Error(error.message || "Failed to retry item");
    }
  }

  /**
   * Get recent posted items across all feeds
   */
  static async getRecentPostedItems(
    userId: string,
    limit: number = 20
  ): Promise<Array<RssFeedItem & { feed?: RssFeedSource }>> {
    const { data, error } = await supabase
      .from("rss_feed_items")
      .select(`
        *,
        feed:rss_feed_sources!inner(*)
      `)
      .eq("feed.user_id", userId)
      .eq("is_posted", true)
      .order("posted_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message || "Failed to fetch recent posted items");
    }

    return data || [];
  }

  /**
   * Get pending items count for a user
   */
  static async getPendingItemsCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("rss_feed_items")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .in(
        "feed_id",
        supabase
          .from("rss_feed_sources")
          .select("id")
          .eq("user_id", userId)
      );

    if (error) {
      throw new Error(error.message || "Failed to fetch pending items count");
    }

    return count || 0;
  }
}
