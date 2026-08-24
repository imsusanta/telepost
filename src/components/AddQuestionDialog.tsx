import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PREDEFINED_SUBJECTS, ClassificationService, refreshSubjectsCache } from "@/services/classificationService";
import { ClassificationMetadataService, ClassificationSubject } from "@/services/classificationMetadataService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { QuestionBankService } from "@/services/questionBankService";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AddQuestionDialogProps {
  onQuestionAdded?: () => void;
  currentCount?: number;
}

export function AddQuestionDialog({ onQuestionAdded, currentCount = 0 }: AddQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { getLimit, isSuperAdmin: adminStatus } = useSubscription();
  const maxLimit = getLimit('max_question_bank_size');
  const isLimitReached = maxLimit !== null && currentCount >= maxLimit;

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState<"bn" | "en" | "hi">("en");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [dbSubjects, setDbSubjects] = useState<ClassificationSubject[]>([]);
  const [isSuperUser, setIsSuperUser] = useState(adminStatus);
  const { toast } = useToast();

  const loadExistingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update super user status from hook value
      setIsSuperUser(adminStatus);

      // Refresh cache and load subjects
      await refreshSubjectsCache();
      const subjects = await ClassificationMetadataService.getSubjects();
      setDbSubjects(subjects);

      const topics = await ClassificationService.getAllTopics(user.id);
      setExistingTopics(topics);
    } catch (error) {
      console.error("Failed to load existing topics/subjects:", error);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (correctIndex >= newOptions.length) {
        setCorrectIndex(newOptions.length - 1);
      }
    }
  };

  const resetForm = () => {
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setExplanation("");
    setTopic("");
    setSubject("");
    setLanguage("en");
    setTags("");
    setIsPublic(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic",
        variant: "destructive",
      });
      return;
    }

    const filledOptions = options.filter(opt => opt.trim());
    if (filledOptions.length < 2) {
      toast({
        title: "Error",
        description: "Please provide at least 2 options",
        variant: "destructive",
      });
      return;
    }

    if (correctIndex >= filledOptions.length) {
      toast({
        title: "Error",
        description: "Please select a valid correct option",
        variant: "destructive",
      });
      return;
    }

    if (isLimitReached && !isSuperUser) {
      toast({
        title: "Limit Reached",
        description: `Your plan allows up to ${maxLimit} questions in the bank. Please upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      const tagArray = tags.split(",").map(t => t.trim()).filter(t => t);

      await QuestionBankService.addQuestion(user.id, {
        question: question.trim(),
        options: filledOptions,
        correct_option_index: correctIndex,
        explanation: explanation.trim() || undefined,
        topic: topic.trim(),
        subject: subject.trim() || undefined,
        language,
        tags: tagArray.length > 0 ? tagArray : undefined,
        source: "manual",
        is_public: isPublic,
        is_active: true,
      });

      toast({
        title: "Success",
        description: "Question added to your question bank",
      });

      resetForm();
      setOpen(false);
      onQuestionAdded?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) loadExistingData();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Question
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Question</DialogTitle>
          <DialogDescription>
            Manually add a question to your question bank
          </DialogDescription>
        </DialogHeader>

        {isLimitReached && !isSuperUser && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limit Reached</AlertTitle>
            <AlertDescription>
              You have {currentCount} questions. Your {maxLimit}-question limit is reached.
              Please upgrade your plan to add more.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Textarea
              id="question"
              placeholder="Enter your question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Options * (at least 2)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={options.length >= 6}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Option
              </Button>
            </div>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={correctIndex === index}
                  onChange={() => setCorrectIndex(index)}
                  className="w-4 h-4"
                />
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Select the correct answer using the radio button
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              placeholder="Explain why this is the correct answer"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <div className="flex gap-2">
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject" className="flex-1">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent className="clay-card border-none max-h-[300px]">
                    {/* DB Subjects */}
                    {dbSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.icon} {s.name}
                      </SelectItem>
                    ))}

                    {/* Fallback to Predefined if DB is empty or doesn't contain them */}
                    {dbSubjects.length === 0 && PREDEFINED_SUBJECTS.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.icon} {s.name}
                      </SelectItem>
                    ))}

                    {/* AI Suggested / Manual (if user is super admin) */}
                    {subject && !dbSubjects.some(s => s.name === subject) && !PREDEFINED_SUBJECTS.some(s => s.name === subject) && (
                      <SelectItem value={subject}>
                        ✨ {subject}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {isSuperUser && (
                  <Input
                    placeholder="New..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-1/3"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Algebra, WWII..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                list="existing-topics"
                required
              />
              <datalist id="existing-topics">
                {existingTopics.map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "bn" | "en" | "hi")}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bn">Bengali</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="Comma-separated tags, e.g., algebra, equations, basics"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="isPublic" className="cursor-pointer">
              Make this question public (others can use it)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (isLimitReached && !isSuperUser)}>
              {loading ? "Adding..." : "Add Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
