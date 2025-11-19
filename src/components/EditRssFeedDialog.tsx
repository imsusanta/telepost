import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { RssService } from "@/services/rssService";
import { RssFeedSource, PostFrequency, UpdateRssFeedRequest } from "@/types/rss";
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
import { Switch } from "@/components/ui/switch";

interface EditRssFeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feed: RssFeedSource;
  channels: Channel[];
  onUpdate: () => void;
}

export const EditRssFeedDialog = ({
  open,
  onOpenChange,
  feed,
  channels,
  onUpdate,
}: EditRssFeedDialogProps) => {
  const { toast } = useToast();
  const [postFrequency, setPostFrequency] = useState<PostFrequency>(feed.post_frequency);
  const [customIntervalMinutes, setCustomIntervalMinutes] = useState(
    feed.custom_interval_minutes || 60
  );
  const [keywords, setKeywords] = useState(
    feed.filters?.keywords?.join(", ") || ""
  );
  const [excludeKeywords, setExcludeKeywords] = useState(
    feed.filters?.exclude_keywords?.join(", ") || ""
  );
  const [autoGenerateQuiz, setAutoGenerateQuiz] = useState(
    feed.settings?.auto_generate_quiz !== false
  );
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState(
    feed.settings?.questions_per_quiz || 5
  );
  const [isActive, setIsActive] = useState(feed.is_active);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Update state when feed prop changes
    setPostFrequency(feed.post_frequency);
    setCustomIntervalMinutes(feed.custom_interval_minutes || 60);
    setKeywords(feed.filters?.keywords?.join(", ") || "");
    setExcludeKeywords(feed.filters?.exclude_keywords?.join(", ") || "");
    setAutoGenerateQuiz(feed.settings?.auto_generate_quiz !== false);
    setQuestionsPerQuiz(feed.settings?.questions_per_quiz || 5);
    setIsActive(feed.is_active);
  }, [feed]);

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const request: UpdateRssFeedRequest = {
        is_active: isActive,
        post_frequency: postFrequency,
        custom_interval_minutes:
          postFrequency === "custom" ? customIntervalMinutes : null,
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

      await RssService.updateRssFeed(feed.id, request);

      toast({
        title: "Success",
        description: "RSS feed updated successfully",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update RSS feed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit RSS Feed</DialogTitle>
          <DialogDescription>
            Update RSS feed settings and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Feed URL</Label>
            <Input value={feed.feed_url} disabled />
            <p className="text-xs text-muted-foreground">
              Feed URL cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label>Channel</Label>
            <Input
              value={
                channels.find((c) => c.id === feed.channel_id)?.name ||
                "Unknown"
              }
              disabled
            />
            <p className="text-xs text-muted-foreground">
              Channel cannot be changed
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded">
            <div className="space-y-0.5">
              <Label>Active Status</Label>
              <p className="text-xs text-muted-foreground">
                Enable or disable this RSS feed
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
