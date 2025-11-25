import { useState, useEffect, useCallback } from "react";
import { SchedulerService, ScheduledPost, ScheduledPostFilters } from "@/services/schedulerService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useScheduledPosts(filters?: ScheduledPostFilters) {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
  } | null>(null);
  const { toast } = useToast();

  // Get user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setIsLoading(false);
      }
    };
    getUser();
  }, []);

  // Fetch posts and set up subscription when userId is available
  useEffect(() => {
    if (!userId) return;

    fetchScheduledPosts();
    fetchStatistics();

    // Set up real-time subscription with user filtering
    const channel = SchedulerService.subscribeToScheduledPosts(userId, (post, eventType) => {
      setScheduledPosts((prev) => {
        if (eventType === "DELETE") {
          return prev.filter((p) => p.id !== post.id);
        }

        const existingIndex = prev.findIndex((p) => p.id === post.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = post;
          return updated;
        }
        // Insert new posts at the beginning
        return [post, ...prev].sort(
          (a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
        );
      });

      // Update statistics on changes
      fetchStatistics();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, fetchScheduledPosts, fetchStatistics]);

  const fetchScheduledPosts = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const posts = await SchedulerService.fetchScheduledPosts(userId, filters);
      setScheduledPosts(posts);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch scheduled posts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, filters, toast]);

  const fetchStatistics = useCallback(async () => {
    if (!userId) return;

    try {
      const stats = await SchedulerService.getStatistics(userId);
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  }, [userId]);

  const cancelPost = useCallback(async (postId: string) => {
    if (!userId) return;

    try {
      await SchedulerService.cancelScheduledPost(postId, userId);
      setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
      toast({
        title: "Success",
        description: "Scheduled post cancelled",
      });
      fetchStatistics();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel scheduled post",
        variant: "destructive",
      });
    }
  }, [userId, toast, fetchStatistics]);

  const retryPost = useCallback(async (postId: string, newTime?: Date) => {
    if (!userId) return;

    try {
      const updatedPost = await SchedulerService.retryFailedPost(postId, userId, newTime);
      setScheduledPosts((prev) =>
        prev.map((p) => (p.id === postId ? updatedPost : p))
      );
      toast({
        title: "Success",
        description: "Failed post scheduled for retry",
      });
      fetchStatistics();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to retry scheduled post",
        variant: "destructive",
      });
    }
  }, [userId, toast, fetchStatistics]);

  return {
    scheduledPosts,
    isLoading,
    statistics,
    refetch: fetchScheduledPosts,
    cancelPost,
    retryPost,
  };
}
