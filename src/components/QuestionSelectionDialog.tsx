import { useState } from "react";
import { Check, Save, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QuestionBankService } from "@/services/questionBankService";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

interface Question {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  difficulty?: string;
}

interface QuestionSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: Question[];
  defaultTopic?: string;
  defaultDifficulty?: string;
  defaultLanguage?: string;
  onSaved?: () => void;
}

export function QuestionSelectionDialog({
  open,
  onOpenChange,
  questions,
  defaultTopic = "",
  defaultLanguage = "en",
  onSaved,
}: QuestionSelectionDialogProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(questions.map((_, i) => i))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuestions, setEditedQuestions] = useState<Question[]>(questions);
  const [topic, setTopic] = useState(defaultTopic);
  const [language, setLanguage] = useState(defaultLanguage);
  const [makePublic, setMakePublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === questions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(questions.map((_, i) => i)));
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...editedQuestions];
    newQuestions[index] = updatedQuestion;
    setEditedQuestions(newQuestions);
    setEditingIndex(null);
  };

  const handleSaveSelected = async () => {
    if (selectedIndices.size === 0) {
      toast({
        title: "No Questions Selected",
        description: "Please select at least one question to save",
        variant: "destructive",
      });
      return;
    }

    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic for the questions",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      const selectedQuestions = Array.from(selectedIndices).map((index) => {
        const q = editedQuestions[index];
        return {
          question: q.question,
          options: q.options,
          correct_option_index: q.correct_option_index,
          explanation: q.explanation,
          topic: topic.trim(),
          language: language as "bn" | "en" | "hi",
          source: "ai_generated",
          is_public: makePublic,
          is_active: true,
          user_id: user.id,
        };
      });

      // Save each question to the database
      const savePromises = selectedQuestions.map((q) =>
        QuestionBankService.addQuestion(user.id, q)
      );

      await Promise.all(savePromises);

      toast({
        title: "Success",
        description: `Saved ${selectedQuestions.length} questions to your Question Bank`,
      });

      onOpenChange(false);
      onSaved?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save questions",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Questions to Save</DialogTitle>
          <DialogDescription>
            Review and select the questions you want to add to your Question Bank.
            You can edit questions before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Global Settings */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Mathematics"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
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
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="makePublic"
                  checked={makePublic}
                  onCheckedChange={(checked) => setMakePublic(checked as boolean)}
                />
                <Label htmlFor="makePublic" className="cursor-pointer">
                  Make questions public (other users can use them)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Select All */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="selectAll"
                checked={selectedIndices.size === questions.length}
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="selectAll" className="cursor-pointer">
                Select All ({selectedIndices.size}/{questions.length})
              </Label>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {editedQuestions.map((q, index) => (
              <Card key={index} className={selectedIndices.has(index) ? "border-primary" : ""}>
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <Checkbox
                      checked={selectedIndices.has(index)}
                      onCheckedChange={() => toggleSelection(index)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-2">
                      {editingIndex === index ? (
                        <QuestionEditor
                          question={q}
                          onSave={(updated) => handleSaveEdit(index, updated)}
                          onCancel={() => setEditingIndex(null)}
                        />
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <p className="font-medium">
                              {index + 1}. {q.question}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(index)}
                              className="gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </Button>
                          </div>

                          <div className="space-y-1">
                            {q.options.map((option, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-2 rounded border text-sm ${
                                  optIdx === q.correct_option_index
                                    ? "bg-green-50 border-green-300 dark:bg-green-950/20"
                                    : ""
                                }`}
                              >
                                {optIdx === q.correct_option_index && (
                                  <Check className="w-3 h-3 inline mr-1 text-green-600" />
                                )}
                                {option}
                              </div>
                            ))}
                          </div>

                          {q.explanation && (
                            <p className="text-sm text-muted-foreground italic">
                              Explanation: {q.explanation}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveSelected} disabled={isSaving} className="gap-2">
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save {selectedIndices.size} Question{selectedIndices.size !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Question Editor Component
function QuestionEditor({
  question,
  onSave,
  onCancel,
}: {
  question: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
}) {
  const [editedQ, setEditedQ] = useState(question.question);
  const [editedOptions, setEditedOptions] = useState([...question.options]);
  const [editedCorrectIndex, setEditedCorrectIndex] = useState(question.correct_option_index);
  const [editedExplanation, setEditedExplanation] = useState(question.explanation || "");

  const handleSave = () => {
    onSave({
      question: editedQ,
      options: editedOptions,
      correct_option_index: editedCorrectIndex,
      explanation: editedExplanation,
    });
  };

  return (
    <div className="space-y-3 border rounded p-3 bg-muted/50">
      <div>
        <Label>Question</Label>
        <Textarea
          value={editedQ}
          onChange={(e) => setEditedQ(e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label>Options</Label>
        <div className="space-y-2">
          {editedOptions.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                checked={editedCorrectIndex === idx}
                onChange={() => setEditedCorrectIndex(idx)}
                className="w-4 h-4"
              />
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...editedOptions];
                  newOpts[idx] = e.target.value;
                  setEditedOptions(newOpts);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Explanation</Label>
        <Textarea
          value={editedExplanation}
          onChange={(e) => setEditedExplanation(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} size="sm">
          Save Changes
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}
