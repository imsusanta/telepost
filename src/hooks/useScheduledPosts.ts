import { useState, useEffect, useCallback } from "react";
import { SchedulerService, ScheduledPost, ScheduledPostFilters } from "@/services/schedulerService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useScheduledPosts(filters?: ScheduledPostFilters) {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
  } | null>(null);
  const { toast } = useToast();

  const totalPages = Math.ceil(totalCount / pageSize);

  // Get user ID on mount
  useEffect(() => {
    let isMounted = true;
    
    const getUser = async () => {
      try {
        // Set a timeout for the user check
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Auth check timed out")), 5000)
        );
        
        const userPromise = supabase.auth.getUser();
        
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any;
        
        if (isMounted) {
          if (user) {
            setUserId(user.id);
          } else {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Auth check failed in hook:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    getUser();
    
    // Safety fallback
    const safetyTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn("Hook loading safety fallback triggered");
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  const fetchScheduledPosts = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const { posts, totalCount: count } = await SchedulerService.fetchScheduledPosts(userId, filters, page, pageSize);
      setScheduledPosts(posts);
      setTotalCount(count);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch scheduled posts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, filters, page, pageSize, toast]);

  const fetchStatistics = useCallback(async () => {
    if (!userId) return;

    try {
      const stats = await SchedulerService.getStatistics(userId);
      setStatistics(stats);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
      // Set statistics to null to indicate fetch failure
      setStatistics(null);
    }
  }, [userId]);

  // Fetch posts and set up subscription when userId is available
  useEffect(() => {
    if (!userId) return;

    fetchScheduledPosts();
    fetchStatistics();

    // Set up real-time subscription with user filtering
    const channel = SchedulerService.subscribeToScheduledPosts(userId, (_post, _eventType) => {
      // For simplicity in pagination, we'll refetch when real-time updates occur
      // to ensure the list and pagination state stay in sync
      fetchScheduledPosts();
      fetchStatistics();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, fetchScheduledPosts, fetchStatistics]);

  const cancelPost = useCallback(async (postId: string) => {
    if (!userId) return;

    try {
      await SchedulerService.cancelScheduledPost(postId, userId);
      // We refetch to keep pagination correct
      fetchScheduledPosts();
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
  }, [userId, toast, fetchStatistics, fetchScheduledPosts]);

  const retryPost = useCallback(async (postId: string, newTime?: Date) => {
    if (!userId) return;

    try {
      await SchedulerService.retryFailedPost(postId, userId, newTime);
      // We refetch to keep pagination correct
      fetchScheduledPosts();
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
  }, [userId, toast, fetchStatistics, fetchScheduledPosts]);

  return {
    scheduledPosts,
    isLoading,
    statistics,
    page,
    setPage,
    totalPages,
    totalCount,
    refetch: fetchScheduledPosts,
    cancelPost,
    retryPost,
  };
}
