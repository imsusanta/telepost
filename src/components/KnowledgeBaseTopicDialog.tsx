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

export function KnowledgeBaseTopicDialog({ open, onOpenChange, topic, onSaved }: KnowledgeBaseTopicDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic_name: "",
    subject: "",
    description: "",
    language: "bn",
    ai_instructions: "",
    exam: "",
    grade: "",
  });

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
    } else {
      setFormData({
        topic_name: "",
        subject: "",
        description: "",
        language: "bn",
        ai_instructions: "",
        exam: "",
        grade: "",
      });
    }
  }, [topic, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic_name.trim()) {
      toast.error("Topic name is required");
      return;
    }

    setLoading(true);
    try {
      if (topic) {
        await KnowledgeBaseService.updateTopic(topic.id, formData);
        toast.success("Topic updated successfully");
      } else {
        await KnowledgeBaseService.createTopic(formData);
        toast.success("Topic created successfully");
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save topic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{topic ? "Edit Topic" : "Add Topic"}</DialogTitle>
          <DialogDescription>
            {topic ? "Update the details of your knowledge base topic." : "Create a new topic for your knowledge base."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic_name">Topic Name <span className="text-destructive">*</span></Label>
            <Input 
              id="topic_name" 
              value={formData.topic_name} 
              onChange={(e) => setFormData({...formData, topic_name: e.target.value})} 
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
                onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                placeholder="e.g. History, Biology" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(v) => setFormData({...formData, language: v})}>
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
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              placeholder="Key facts, summary, or details for this topic..." 
              className="resize-none" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam">Exam (Optional)</Label>
              <Input 
                id="exam" 
                value={formData.exam} 
                onChange={(e) => setFormData({...formData, exam: e.target.value})} 
                placeholder="e.g. WBCS, SSC, UPSC" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grade">Grade / Level (Optional)</Label>
              <Input 
                id="grade" 
                value={formData.grade} 
                onChange={(e) => setFormData({...formData, grade: e.target.value})} 
                placeholder="e.g. Class 10, Graduate" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ai_instructions">AI Instructions (Optional)</Label>
            <Textarea 
              id="ai_instructions" 
              value={formData.ai_instructions} 
              onChange={(e) => setFormData({...formData, ai_instructions: e.target.value})} 
              placeholder="Specific instructions for AI when generating questions/posts for this topic (e.g. Focus on dates and treaties)..." 
              className="resize-none h-24" 
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Topic
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
