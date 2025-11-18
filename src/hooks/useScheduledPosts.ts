import { useState, useEffect } from "react";
import { SchedulerService, ScheduledPost } from "@/services/schedulerService";
import { useToast } from "@/hooks/use-toast";

export function useScheduledPosts() {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchScheduledPosts();

    const channel = SchedulerService.subscribeToScheduledPosts((post) => {
      setScheduledPosts((prev) => {
        const existingIndex = prev.findIndex((p) => p.id === post.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = post;
          return updated;
        }
        return [post, ...prev];
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const fetchScheduledPosts = async () => {
    try {
      const posts = await SchedulerService.fetchScheduledPosts();
      setScheduledPosts(posts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch scheduled posts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    scheduledPosts,
    isLoading,
    refetch: fetchScheduledPosts,
  };
}
