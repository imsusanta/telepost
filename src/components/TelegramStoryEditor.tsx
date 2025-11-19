import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { StoryService, CreateStoryData, StoryTemplate, TextOverlay, Sticker } from "@/services/storyService";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Send from "lucide-react/dist/esm/icons/send";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Type from "lucide-react/dist/esm/icons/type";
import Upload from "lucide-react/dist/esm/icons/upload";
import VideoIcon from "lucide-react/dist/esm/icons/video";
import { StoryPreviewModal } from "./StoryPreviewModal";
import { StoryTemplateSelector } from "./StoryTemplateSelector";
import { TextOverlayEditor } from "./TextOverlayEditor";

interface Channel {
  id: string;
  name: string;
  chat_id: string;
}

interface TelegramStoryEditorProps {
  userId: string;
  channels: Channel[];
  onStoryCreated?: (storyId: string) => void;
}

export const TelegramStoryEditor: React.FC<TelegramStoryEditorProps> = ({
  userId,
  channels,
  onStoryCreated,
}) => {
  const { toast } = useToast();

  // Story configuration state
  const [mediaType, setMediaType] = useState<"image" | "video" | "text">("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [chatId, setChatId] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [isHighlight, setIsHighlight] = useState(false);

  // Text overlay state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [backgroundColor, setBackgroundColor] = useState("#3B82F6");

  // Stickers state
  const [stickers, setStickers] = useState<Sticker[]>([]);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null);

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");

  // UI state
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [createdStoryId, setCreatedStoryId] = useState<string | null>(null);

  // Update chat ID when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      const channel = channels.find(c => c.id === selectedChannel);
      if (channel) {
        setChatId(channel.chat_id);
      }
    }
  }, [selectedChannel, channels]);

  // Apply template when selected
  const handleTemplateSelect = (template: StoryTemplate) => {
    setSelectedTemplate(template);
    setMediaType(template.media_type);
    setBackgroundColor(template.background_color || "#3B82F6");
    setTextOverlays(template.default_text_overlay || []);
    setStickers(template.default_stickers || []);

    toast({
      title: "Template applied",
      description: `Using template: ${template.name}`,
    });
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (mediaType === "image" && !file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (mediaType === "video" && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    const maxSize = mediaType === "image" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Maximum size: ${mediaType === "image" ? "10MB" : "50MB"}`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  // Upload media file
  const uploadMedia = async (): Promise<string | undefined> => {
    if (!selectedFile) return undefined;

    try {
      setIsUploading(true);
      const mediaUrl = await StoryService.uploadStoryMedia(
        userId,
        selectedFile,
        mediaType as "image" | "video"
      );

      toast({
        title: "Media uploaded",
        description: "Your media has been uploaded successfully",
      });

      return mediaUrl;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload media",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Create story draft
  const handleSaveDraft = async () => {
    try {
      let mediaUrl: string | undefined;

      if (mediaType !== "text" && selectedFile) {
        mediaUrl = await uploadMedia();
      }

      const storyData: CreateStoryData = {
        channel_id: selectedChannel || undefined,
        media_type: mediaType,
        media_url: mediaUrl,
        caption,
        text_overlay: textOverlays,
        background_color: mediaType === "text" ? backgroundColor : undefined,
        stickers,
        duration_hours: durationHours,
        telegram_chat_id: chatId || undefined,
        is_highlight: isHighlight,
        template_id: selectedTemplate?.template_id,
      };

      const story = await StoryService.createStory(userId, storyData);
      setCreatedStoryId(story.story_id);

      toast({
        title: "Draft saved",
        description: "Your story draft has been saved successfully",
      });

      if (onStoryCreated) {
        onStoryCreated(story.story_id);
      }
    } catch (error: any) {
      toast({
        title: "Failed to save draft",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Post story immediately
  const handlePostNow = async () => {
    if (!chatId) {
      toast({
        title: "Chat ID required",
        description: "Please select a channel or enter a chat ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPosting(true);

      // Save draft first
      await handleSaveDraft();

      if (!createdStoryId) {
        throw new Error("Failed to create story");
      }

      // Post story
      await StoryService.postStoryNow(createdStoryId);

      toast({
        title: "Story posted!",
        description: "Your story has been posted to Telegram successfully",
      });

      // Reset form
      resetForm();

      if (onStoryCreated) {
        onStoryCreated(createdStoryId);
      }
    } catch (error: any) {
      toast({
        title: "Failed to post story",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Schedule story
  const handleSchedule = async () => {
    if (!chatId) {
      toast({
        title: "Chat ID required",
        description: "Please select a channel or enter a chat ID",
        variant: "destructive",
      });
      return;
    }

    if (!scheduledTime) {
      toast({
        title: "Schedule time required",
        description: "Please select when to post the story",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPosting(true);

      let mediaUrl: string | undefined;

      if (mediaType !== "text" && selectedFile) {
        mediaUrl = await uploadMedia();
      }

      const storyData: CreateStoryData = {
        channel_id: selectedChannel || undefined,
        media_type: mediaType,
        media_url: mediaUrl,
        caption,
        text_overlay: textOverlays,
        background_color: mediaType === "text" ? backgroundColor : undefined,
        stickers,
        duration_hours: durationHours,
        scheduled_time: scheduledTime,
        telegram_chat_id: chatId || undefined,
        is_highlight: isHighlight,
        template_id: selectedTemplate?.template_id,
      };

      const story = await StoryService.createStory(userId, storyData);

      toast({
        title: "Story scheduled",
        description: `Your story will be posted on ${new Date(scheduledTime).toLocaleString()}`,
      });

      // Reset form
      resetForm();

      if (onStoryCreated) {
        onStoryCreated(story.story_id);
      }
    } catch (error: any) {
      toast({
        title: "Failed to schedule story",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedFile(null);
    setMediaPreviewUrl("");
    setCaption("");
    setTextOverlays([]);
    setStickers([]);
    setScheduledTime("");
    setIsScheduled(false);
    setCreatedStoryId(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Create Telegram Story
        </CardTitle>
        <CardDescription>
          Create engaging stories to share with your Telegram channels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            {/* Media Type Selection */}
            <div className="space-y-2">
              <Label>Story Type</Label>
              <Select value={mediaType} onValueChange={(value: any) => setMediaType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Image Story
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="h-4 w-4" />
                      Video Story
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Text Story
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Media Upload */}
            {mediaType !== "text" && (
              <div className="space-y-2">
                <Label>Upload {mediaType === "image" ? "Image" : "Video"}</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {mediaPreviewUrl ? (
                    <div className="space-y-2">
                      {mediaType === "image" ? (
                        <img
                          src={mediaPreviewUrl}
                          alt="Preview"
                          className="max-h-48 mx-auto rounded"
                        />
                      ) : (
                        <video
                          src={mediaPreviewUrl}
                          className="max-h-48 mx-auto rounded"
                          controls
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setMediaPreviewUrl("");
                        }}
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload {mediaType} (max {mediaType === "image" ? "10MB" : "50MB"})
                      </p>
                      <Input
                        type="file"
                        accept={mediaType === "image" ? "image/*" : "video/*"}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Button variant="secondary" size="sm">
                        Choose File
                      </Button>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                placeholder="Add a caption for your story..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
              />
            </div>

            {/* Channel Selection */}
            <div className="space-y-2">
              <Label>Select Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a channel..." />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chat ID (manual override) */}
            <div className="space-y-2">
              <Label>Chat ID (optional override)</Label>
              <Input
                placeholder="@channelname or -100xxxxxxxxxx"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-4">
            <TextOverlayEditor
              overlays={textOverlays}
              onChange={setTextOverlays}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={setBackgroundColor}
              showBackground={mediaType === "text"}
            />
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
              />
              <Label>Schedule for later</Label>
            </div>

            {isScheduled && (
              <div className="space-y-2">
                <Label>Schedule Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={durationHours}
                onChange={(e) => setDurationHours(parseInt(e.target.value) || 24)}
              />
              <p className="text-sm text-muted-foreground">
                Story will be visible for {durationHours} hours (max 7 days)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={isHighlight}
                onCheckedChange={setIsHighlight}
              />
              <Label>Save as Highlight (permanent)</Label>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <StoryTemplateSelector onSelect={handleTemplateSelect} />
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={mediaType !== "text" && !selectedFile}
          >
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isUploading || isPosting}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Save Draft"
            )}
          </Button>
          {isScheduled ? (
            <Button
              onClick={handleSchedule}
              disabled={isUploading || isPosting || !chatId}
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Story
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePostNow}
              disabled={isUploading || isPosting || !chatId}
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post Now
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>

      {/* Preview Modal */}
      {showPreview && (
        <StoryPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          storyData={{
            media_type: mediaType,
            media_url: mediaPreviewUrl,
            caption,
            text_overlay: textOverlays,
            background_color: backgroundColor,
            stickers,
          }}
        />
      )}
    </Card>
  );
};
