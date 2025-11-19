import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { RssService } from "@/services/rssService";
import { CreateRssFeedRequest, PostFrequency, RssFeedPreview } from "@/types/rss";
import { Channel } from "@/types/channel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface AddRssFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: Channel[];
  onAdd: (request: CreateRssFeedRequest) => void;
}

export const AddRssFeedDialog = ({
  open,
  onOpenChange,
  channels,
  onAdd,
}: AddRssFeedDialogProps) => {
  const { toast } = useToast();
  const [feedUrl, setFeedUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [postFrequency, setPostFrequency] = useState<PostFrequency>("daily");
  const [customIntervalMinutes, setCustomIntervalMinutes] = useState(60);
  const [keywords, setKeywords] = useState("");
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [autoGenerateQuiz, setAutoGenerateQuiz] = useState(true);
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState(5);
  const [preview, setPreview] = useState<RssFeedPreview | null>(null);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleValidate = async () => {
    if (!feedUrl) {
      toast({
        title: "Error",
        description: "Please enter a feed URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setValidating(true);
      const previewData = await RssService.previewRssFeed(feedUrl);
      setPreview(previewData);
      setValidated(true);
      toast({
        title: "Success",
        description: "RSS feed validated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to validate RSS feed",
        variant: "destructive",
      });
      setValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = () => {
    if (!feedUrl || !channelId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!validated) {
      toast({
        title: "Error",
        description: "Please validate the RSS feed first",
        variant: "destructive",
      });
      return;
    }

    const request: CreateRssFeedRequest = {
      channel_id: channelId,
      feed_url: feedUrl,
      post_frequency: postFrequency,
      custom_interval_minutes: postFrequency === "custom" ? customIntervalMinutes : undefined,
      filters: {
        keywords: keywords ? keywords.split(",").map((k) => k.trim()) : [],
        exclude_keywords: excludeKeywords
          ? excludeKeywords.split(",").map((k) => k.trim())
          : [],
      },
      settings: {
        auto_generate_quiz: autoGenerateQuiz,
        questions_per_quiz: questionsPerQuiz,
      },
    };

    onAdd(request);
    handleReset();
  };

  const handleReset = () => {
    setFeedUrl("");
    setChannelId("");
    setPostFrequency("daily");
    setCustomIntervalMinutes(60);
    setKeywords("");
    setExcludeKeywords("");
    setAutoGenerateQuiz(true);
    setQuestionsPerQuiz(5);
    setPreview(null);
    setValidated(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add RSS Feed</DialogTitle>
          <DialogDescription>
            Add a new RSS feed to automatically post content to your Telegram
            channel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedUrl">RSS Feed URL *</Label>
            <div className="flex gap-2">
              <Input
                id="feedUrl"
                placeholder="https://example.com/feed.xml"
                value={feedUrl}
                onChange={(e) => {
                  setFeedUrl(e.target.value);
                  setValidated(false);
                  setPreview(null);
                }}
              />
              <Button
                onClick={handleValidate}
                disabled={validating || !feedUrl}
                variant="outline"
              >
                {validating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : validated ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
          </div>

          {preview && (
            <div className="p-4 bg-green-50 border border-green-200 rounded space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900">
                  Feed Validated
                </span>
              </div>
              <p className="text-sm font-medium">{preview.feed_title}</p>
              <p className="text-sm text-gray-600">{preview.feed_description}</p>
              <p className="text-sm text-gray-500">
                Found {preview.items.length} recent items
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="channel">Telegram Channel *</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a channel" />
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

          <div className="space-y-2">
            <Label htmlFor="frequency">Post Frequency</Label>
            <Select
              value={postFrequency}
              onValueChange={(value) => setPostFrequency(value as PostFrequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom Interval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {postFrequency === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="interval">Custom Interval (minutes)</Label>
              <Input
                id="interval"
                type="number"
                min="30"
                value={customIntervalMinutes}
                onChange={(e) => setCustomIntervalMinutes(Number(e.target.value))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="keywords">Filter Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              placeholder="technology, AI, programming"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only include items containing these keywords
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excludeKeywords">
              Exclude Keywords (comma-separated)
            </Label>
            <Input
              id="excludeKeywords"
              placeholder="politics, sports"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Exclude items containing these keywords
            </p>
          </div>

          <div className="space-y-4 p-4 border rounded">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Generate Quiz</Label>
                <p className="text-xs text-muted-foreground">
                  Generate quiz from RSS content
                </p>
              </div>
              <Switch
                checked={autoGenerateQuiz}
                onCheckedChange={setAutoGenerateQuiz}
              />
            </div>

            {autoGenerateQuiz && (
              <div className="space-y-2">
                <Label htmlFor="questionsPerQuiz">Questions per Quiz</Label>
                <Input
                  id="questionsPerQuiz"
                  type="number"
                  min="1"
                  max="20"
                  value={questionsPerQuiz}
                  onChange={(e) => setQuestionsPerQuiz(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!validated}>
            Add RSS Feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
