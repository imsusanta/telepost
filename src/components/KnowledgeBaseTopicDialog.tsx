import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const emptyForm = {
  topic_name: "",
  subject: "",
  description: "",
  language: "bn",
  ai_instructions: "",
  exam: "",
  grade: "",
};

export function KnowledgeBaseTopicDialog({ open, onOpenChange, topic, onSaved }: KnowledgeBaseTopicDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [bulkTopics, setBulkTopics] = useState("");
  const isEditing = Boolean(topic);

  useEffect(() => {
    if (topic) {
      setFormData({
        topic_name: topic.topic_name || "",
        subject: topic.subject || "",
        description: topic.description || "",
        language: topic.language || "bn",
        ai_instructions: topic.ai_instructions || "",
        exam: topic.exam || "",
        grade: topic.grade || "",
      });
      setBulkTopics("");
    } else {
      setFormData(emptyForm);
      setBulkTopics("");
    }
  }, [topic, open]);

  const parseBulkTopics = (value: string): string[] => {
    const seen = new Set<string>();
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLocaleLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing && topic) {
        if (!formData.topic_name.trim()) {
          toast.error("Topic name is required");
          return;
        }
        await KnowledgeBaseService.updateTopic(topic.id, formData);
        toast.success("Topic updated successfully");
      } else {
        const names = parseBulkTopics(bulkTopics);
        if (names.length === 0) {
          toast.error("Enter at least one topic");
          return;
        }

        const created = await KnowledgeBaseService.createTopicsBulk(
          names.map((topic_name) => ({ topic_name, language: formData.language }))
        );
        toast.success(`${created.length} topic${created.length === 1 ? "" : "s"} added successfully`);
      }

      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save topic(s)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Topic" : "Add Topics"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of your knowledge base topic."
              : "Paste multiple topics, one per line. Subject is not required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="topic_name">Topic Name <span className="text-destructive">*</span></Label>
                <Input
                  id="topic_name"
                  value={formData.topic_name}
                  onChange={(e) => setFormData({ ...formData, topic_name: e.target.value })}
                  placeholder="e.g. Mughal Empire, Photosynthesis, Constitution"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description / Key Notes</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional key facts, summary, or details..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_instructions">AI Instructions</Label>
                <Textarea
                  id="ai_instructions"
                  value={formData.ai_instructions}
                  onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
                  placeholder="Optional instructions for AI for this topic..."
                  className="resize-none h-24"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="bulk_topics">Topics <span className="text-destructive">*</span></Label>
                <Textarea
                  id="bulk_topics"
                  value={bulkTopics}
                  onChange={(e) => setBulkTopics(e.target.value)}
                  placeholder={'1. প্রাচীন ভারতের ইতিহাস\n2. আধুনিক ভারতের ইতিহাস\n3. স্বাধীনতা আন্দোলন'}
                  className="min-h-[240px] resize-y font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  One topic per line. Numbering such as 1., 2), or 3. is automatically removed. Duplicate topics in the same paste are ignored.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Topic" : "Add Topics"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
