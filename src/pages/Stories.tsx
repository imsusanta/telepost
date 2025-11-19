import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { TelegramStoryEditor } from "@/components/TelegramStoryEditor";
import { StoryAnalytics } from "@/components/StoryAnalytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { StoryService, Story } from "@/services/storyService";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Trash2,
  Star,
  Eye,
  Image as ImageIcon,
  Video as VideoIcon,
  Type,
  Sparkles,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Stories() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [channels, setChannels] = useState<any[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStories, setActiveStories] = useState<Story[]>([]);
  const [scheduledStories, setScheduledStories] = useState<Story[]>([]);
  const [highlights, setHighlights] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [deleteConfirmStory, setDeleteConfirmStory] = useState<Story | null>(null);

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      // Load channels
      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .eq("user_id", user.id);

      if (channelsError) throw channelsError;
      setChannels(channelsData || []);

      // Load stories
      await loadStories(user.id);
    } catch (error: any) {
      toast({
        title: "Failed to load data",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStories = async (uid: string) => {
    try {
      // Load all stories
      const allStories = await StoryService.getUserStories(uid, { limit: 100 });
      setStories(allStories);

      // Load active stories
      const active = await StoryService.getActiveStories(uid);
      setActiveStories(active);

      // Load scheduled stories
      const scheduled = await StoryService.getScheduledStories(uid);
      setScheduledStories(scheduled);

      // Load highlights
      const highlightList = await StoryService.getHighlights(uid);
      setHighlights(highlightList);
    } catch (error: any) {
      toast({
        title: "Failed to load stories",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleStoryCreated = (storyId: string) => {
    setShowEditor(false);
    if (userId) {
      loadStories(userId);
    }
  };

  const handleDeleteStory = async (story: Story) => {
    try {
      await StoryService.deleteStory(story.story_id, userId);

      toast({
        title: "Story deleted",
        description: "The story has been deleted successfully",
      });

      setDeleteConfirmStory(null);
      if (userId) {
        loadStories(userId);
      }
    } catch (error: any) {
      toast({
        title: "Failed to delete story",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleToggleHighlight = async (story: Story) => {
    try {
      await StoryService.toggleHighlight(story.story_id, userId, !story.is_highlight);

      toast({
        title: story.is_highlight ? "Removed from highlights" : "Added to highlights",
        description: story.is_highlight
          ? "Story will expire normally"
          : "Story will be saved permanently",
      });

      if (userId) {
        loadStories(userId);
      }
    } catch (error: any) {
      toast({
        title: "Failed to update story",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: Story["status"]) => {
    const variants: Record<Story["status"], { variant: any; icon: any; label: string }> = {
      draft: { variant: "secondary", icon: Clock, label: "Draft" },
      scheduled: { variant: "default", icon: Calendar, label: "Scheduled" },
      posted: { variant: "default", icon: CheckCircle2, label: "Posted" },
      failed: { variant: "destructive", icon: XCircle, label: "Failed" },
      expired: { variant: "outline", icon: Clock, label: "Expired" },
      deleted: { variant: "outline", icon: Trash2, label: "Deleted" },
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getMediaTypeIcon = (mediaType: Story["media_type"]) => {
    switch (mediaType) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <VideoIcon className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
    }
  };

  const renderStoryCard = (story: Story) => (
    <Card key={story.story_id} className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getMediaTypeIcon(story.media_type)}
              <CardTitle className="text-base">
                {story.caption || "Untitled Story"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(story.status)}
              {story.is_highlight && (
                <Badge className="bg-yellow-500">
                  <Star className="h-3 w-3 mr-1" />
                  Highlight
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Preview */}
        {story.media_type !== "text" && story.media_url && (
          <div className="aspect-video rounded-lg overflow-hidden border bg-gray-100">
            {story.media_type === "image" ? (
              <img
                src={story.media_url}
                alt="Story preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={story.media_url}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}

        {story.media_type === "text" && (
          <div
            className="aspect-video rounded-lg overflow-hidden border flex items-center justify-center p-4"
            style={{ backgroundColor: story.background_color || "#3B82F6" }}
          >
            {story.text_overlay && story.text_overlay.length > 0 && (
              <div className="text-center">
                {story.text_overlay.map((overlay, index) => (
                  <div
                    key={index}
                    style={{
                      fontSize: `${Math.min(overlay.fontSize / 2, 24)}px`,
                      fontWeight: overlay.fontWeight || "normal",
                      color: overlay.color,
                    }}
                  >
                    {overlay.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {story.views_count}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {story.duration_hours}h
          </div>
        </div>

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1">
          {story.scheduled_time && story.status === "scheduled" && (
            <div>Scheduled: {new Date(story.scheduled_time).toLocaleString()}</div>
          )}
          {story.posted_at && (
            <div>Posted: {new Date(story.posted_at).toLocaleString()}</div>
          )}
          {story.expires_at && !story.is_highlight && (
            <div>Expires: {new Date(story.expires_at).toLocaleString()}</div>
          )}
        </div>

        {story.error_message && (
          <div className="text-xs text-destructive p-2 bg-destructive/10 rounded">
            {story.error_message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedStory(story)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Analytics
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleHighlight(story)}
          >
            <Star className={`h-4 w-4 mr-1 ${story.is_highlight ? "fill-yellow-500" : ""}`} />
            {story.is_highlight ? "Unhighlight" : "Highlight"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteConfirmStory(story)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Telegram Stories"
          description="Create and manage engaging stories for your Telegram channels"
        >
          <Button onClick={() => setShowEditor(!showEditor)}>
            {showEditor ? (
              <>View Stories</>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Story
              </>
            )}
          </Button>
        </PageHeader>

        {showEditor ? (
          <TelegramStoryEditor
            userId={userId}
            channels={channels}
            onStoryCreated={handleStoryCreated}
          />
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All Stories ({stories.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeStories.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                Scheduled ({scheduledStories.length})
              </TabsTrigger>
              <TabsTrigger value="highlights">
                Highlights ({highlights.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {stories.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No stories yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first Telegram story to get started
                    </p>
                    <Button onClick={() => setShowEditor(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Story
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stories.map(renderStoryCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4 mt-6">
              {activeStories.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No active stories
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeStories.map(renderStoryCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4 mt-6">
              {scheduledStories.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No scheduled stories
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduledStories.map(renderStoryCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="highlights" className="space-y-4 mt-6">
              {highlights.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No story highlights
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {highlights.map(renderStoryCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Analytics Modal */}
        {selectedStory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Story Analytics</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedStory(null)}
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
                <StoryAnalytics
                  storyId={selectedStory.story_id}
                  userId={userId}
                  story={selectedStory}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteConfirmStory}
          onOpenChange={() => setDeleteConfirmStory(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Story?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the story
                and all its analytics data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmStory && handleDeleteStory(deleteConfirmStory)}
                className="bg-destructive text-destructive-foreground"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
