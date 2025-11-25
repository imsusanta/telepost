import React, { useEffect, useState, useCallback } from "react";
import { Eye, Forward, Heart, Loader2, Share2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StoryService, Story } from "@/services/storyService";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface AnalyticsEvent {
  event_type: string;
  viewer_username?: string;
  created_at: string;
}

interface AnalyticsData {
  story: Story;
  metrics: {
    views: number;
    reach: number;
    engagement_rate: number;
    completion_rate: number;
  };
  timeline: Array<{ timestamp: string; views: number; interactions: number }>;
  events?: AnalyticsEvent[];
}

interface StoryAnalyticsProps {
  storyId: string;
  userId: string;
  story?: Story;
}

export const StoryAnalytics: React.FC<StoryAnalyticsProps> = ({
  storyId,
  userId,
  story,
}) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await StoryService.getStoryAnalytics(storyId, userId);
      setAnalytics(data);
    } catch (error) {
      toast({
        title: "Failed to load analytics",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [storyId, userId, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No analytics data available
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: "Views",
      value: analytics.metrics.views || 0,
      icon: Eye,
      color: "text-blue-500",
    },
    {
      label: "Reach",
      value: analytics.metrics.reach || 0,
      icon: Share2,
      color: "text-green-500",
    },
    {
      label: "Engagement Rate",
      value: `${(analytics.metrics.engagement_rate || 0).toFixed(1)}%`,
      icon: Heart,
      color: "text-red-500",
    },
    {
      label: "Completion Rate",
      value: `${(analytics.metrics.completion_rate || 0).toFixed(1)}%`,
      icon: Forward,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Story Analytics</CardTitle>
          <CardDescription>
            Performance metrics for your story
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center p-4 rounded-lg border bg-card"
              >
                <stat.icon className={`h-6 w-6 mb-2 ${stat.color}`} />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {story && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="ml-2" variant={story.status === "posted" ? "default" : "secondary"}>
                    {story.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <Badge className="ml-2" variant="outline">
                    {story.media_type}
                  </Badge>
                </div>
                {story.posted_at && (
                  <div>
                    <span className="text-muted-foreground">Posted:</span>
                    <span className="ml-2">{new Date(story.posted_at).toLocaleString()}</span>
                  </div>
                )}
                {story.expires_at && !story.is_highlight && (
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="ml-2">{new Date(story.expires_at).toLocaleString()}</span>
                  </div>
                )}
                {story.is_highlight && (
                  <div>
                    <Badge className="bg-yellow-500">Highlight</Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {analytics.events && analytics.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest interactions with your story
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.events.slice(0, 10).map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded border"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{event.event_type}</Badge>
                    {event.viewer_username && (
                      <span className="text-sm text-muted-foreground">
                        @{event.viewer_username}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
