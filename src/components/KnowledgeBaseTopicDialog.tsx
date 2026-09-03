import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KnowledgeBaseTopic } from "@/types/knowledgeBase";
import { KnowledgeBaseService } from "@/services/knowledgeBaseService";
import { Loader2 } from "lucide-react";

interface KnowledgeBaseTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic?: KnowledgeBaseTopic | null;
  onSaved: () => void;
}

function parseTopics(input: string): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];

  for (const rawLine of input.split(/\r?\n/)) {
    const topic = rawLine
      .replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "")
      .trim();
    if (!topic) continue;
    const key = topic.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(topic);
  }
  return topics;
}

export function KnowledgeBaseTopicDialog({ open, onOpenChange, topic, onSaved }: KnowledgeBaseTopicDialogProps) {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const isEditing = Boolean(topic);

  useEffect(() => {
    if (open) setInput(topic?.topic_name || "");
  }, [open, topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const topics = parseTopics(input);
    if (!topics.length) {
      toast.error("Enter at least one topic");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && topic) {
        await KnowledgeBaseService.updateTopic(topic.id, { topic_name: topics[0] });
        toast.success("Topic updated successfully");
      } else {
        const created = await KnowledgeBaseService.createTopicsBulk(
          topics.map((topic_name) => ({ topic_name, language: "bn" }))
        );
        toast.success(`${created.length} topic${created.length === 1 ? "" : "s"} added successfully`);
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save topic(s)");
    } finally {
      setLoading(false);
    }
  };

  const count = parseTopics(input).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Topic" : "Add Topics"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the topic name used by TelePost AI."
              : "Paste one topic per line. Subject is not required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="knowledge-topics">Topics</Label>
            <Textarea
              id="knowledge-topics"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'1. ভারতের প্রাচীন ইতিহাস\n2. ভারতীয় সংবিধান\n3. পশ্চিমবঙ্গের ইতিহাস'}
              className="min-h-[240px] resize-y rounded-xl font-medium leading-7"
              autoFocus
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>One topic per line. Numbering and bullets are removed automatically.</span>
              <span>{count} topic{count === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Topic" : "Add Topics"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
