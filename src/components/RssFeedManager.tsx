import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { RssService } from "@/services/rssService";
import {
  RssFeedSource,
  RssFeedStatistics,
  CreateRssFeedRequest,
} from "@/types/rss";
import { Channel } from "@/types/channel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Rss, RefreshCw, Trash2, Edit, Power } from "lucide-react";
import { AddRssFeedDialog } from "./AddRssFeedDialog";
import { EditRssFeedDialog } from "./EditRssFeedDialog";
import { RssFeedItems } from "./RssFeedItems";

interface RssFeedManagerProps {
  userId: string;
  channels: Channel[];
}

export const RssFeedManager = ({ userId, channels }: RssFeedManagerProps) => {
  const { toast } = useToast();
  const [feeds, setFeeds] = useState<RssFeedSource[]>([]);
  const [statistics, setStatistics] = useState<RssFeedStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState<RssFeedSource | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);

  useEffect(() => {
    loadFeeds();
  }, [userId]);

  const loadFeeds = async () => {
    try {
      setLoading(true);
      const [feedsData, statsData] = await Promise.all([
        RssService.getUserRssFeeds(userId),
        RssService.getFeedStatistics(userId),
      ]);
      setFeeds(feedsData);
      setStatistics(statsData);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load RSS feeds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async (request: CreateRssFeedRequest) => {
    try {
      await RssService.createRssFeed(userId, request);
      toast({
        title: "Success",
        description: "RSS feed added successfully",
      });
      setAddDialogOpen(false);
      loadFeeds();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add RSS feed",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (feed: RssFeedSource) => {
    try {
      await RssService.toggleRssFeedActive(feed.id, !feed.is_active);
      toast({
        title: "Success",
        description: `RSS feed ${!feed.is_active ? "activated" : "deactivated"}`,
      });
      loadFeeds();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to toggle feed status",
        variant: "destructive",
      });
    }
  };

  const handleRefreshFeed = async (feedId: string) => {
    try {
      await RssService.triggerFeedProcessing(feedId);
      toast({
        title: "Success",
        description: "Feed processing triggered",
      });
      setTimeout(() => loadFeeds(), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to refresh feed",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm("Are you sure you want to delete this RSS feed?")) {
      return;
    }

    try {
      await RssService.deleteRssFeed(feedId);
      toast({
        title: "Success",
        description: "RSS feed deleted",
      });
      loadFeeds();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete feed",
        variant: "destructive",
      });
    }
  };

  const handleEditFeed = (feed: RssFeedSource) => {
    setSelectedFeed(feed);
    setEditDialogOpen(true);
  };

  const getChannelName = (channelId: string) => {
    return channels.find((c) => c.id === channelId)?.name || "Unknown Channel";
  };

  const getFeedStats = (feedId: string) => {
    return statistics.find((s) => s.feed_id === feedId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RSS Auto-Post</h2>
          <p className="text-muted-foreground">
            Automatically post content from RSS feeds to Telegram channels
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add RSS Feed
        </Button>
      </div>

      {feeds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rss className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No RSS Feeds</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first RSS feed
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add RSS Feed
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feeds.map((feed) => {
            const stats = getFeedStats(feed.id);
            return (
              <Card key={feed.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">
                          {feed.feed_title || feed.feed_url}
                        </CardTitle>
                        <Badge variant={feed.is_active ? "default" : "secondary"}>
                          {feed.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{feed.post_frequency}</Badge>
                      </div>
                      <CardDescription>
                        Channel: {getChannelName(feed.channel_id)} | {feed.feed_url}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleToggleActive(feed)}
                        title={feed.is_active ? "Deactivate" : "Activate"}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRefreshFeed(feed.id)}
                        title="Refresh Feed"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditFeed(feed)}
                        title="Edit Feed"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteFeed(feed.id)}
                        title="Delete Feed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {stats && (
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Items</p>
                        <p className="text-2xl font-bold">{stats.total_items}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Posted</p>
                        <p className="text-2xl font-bold text-green-600">
                          {stats.posted_items}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {stats.pending_items}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                          {stats.failed_items}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        Last fetched:{" "}
                        {feed.last_fetched_at
                          ? new Date(feed.last_fetched_at).toLocaleString()
                          : "Never"}
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSelectedFeedId(feed.id)}
                      >
                        View Items
                      </Button>
                    </div>
                    {feed.last_error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        Error: {feed.last_error}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AddRssFeedDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        channels={channels}
        onAdd={handleAddFeed}
      />

      {selectedFeed && (
        <EditRssFeedDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          feed={selectedFeed}
          channels={channels}
          onUpdate={() => {
            setEditDialogOpen(false);
            loadFeeds();
          }}
        />
      )}

      {selectedFeedId && (
        <RssFeedItems
          feedId={selectedFeedId}
          onClose={() => setSelectedFeedId(null)}
        />
      )}
    </div>
  );
};
