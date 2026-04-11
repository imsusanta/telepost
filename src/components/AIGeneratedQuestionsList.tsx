import { useState, useEffect } from "react";
import { Plus, Trash2, Sparkles, FileText, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { TempQuestionStorageService, TempQuestion } from "@/services/tempQuestionStorage";
import { useSubscription } from "@/hooks/useSubscription";
import { QuestionBankService } from "@/services/questionBankService";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface AIGeneratedQuestionsListProps {
  onQuestionsAdded?: () => void;
  sourceType?: 'ai_generator' | 'pdf_generator'; // Optional: filter by source type
  currentCount?: number;
}

export function AIGeneratedQuestionsList({ onQuestionsAdded, sourceType, currentCount = 0 }: AIGeneratedQuestionsListProps) {
  const [questions, setQuestions] = useState<TempQuestion[]>([]);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  const { getLimit, isSuperAdmin } = useSubscription();
  const maxLimit = getLimit('max_question_bank_size');
  const isLimitReached = maxLimit !== null && currentCount >= maxLimit;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterSource, setFilterSource] = useState<string>(sourceType || "all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'bulk' | string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<'bulk' | 'all' | null>(null);
  const { toast } = useToast();

  // Get unique topics from questions for the filter dropdown
  const getUniqueTopics = (): string[] => {
    const baseQuestions = sourceType
      ? TempQuestionStorageService.getFiltered({ source_type: sourceType })
      : TempQuestionStorageService.getAll();
    const topics = [...new Set(baseQuestions.map(q => q.topic))];
    return topics.sort();
  };

  const loadQuestions = () => {
    const filters: any = {};
    if (filterSource !== "all") {
      filters.source_type = filterSource;
    }
    if (filterTopic !== "all") {
      filters.topic = filterTopic;
    }
    if (filterDifficulty !== "all") {
      filters.difficulty = filterDifficulty;
    }
    if (filterLanguage !== "all") {
      filters.language = filterLanguage;
    }

    const filtered = Object.keys(filters).length > 0
      ? TempQuestionStorageService.getFiltered(filters)
      : TempQuestionStorageService.getAll();

    setQuestions(filtered);
  };

  useEffect(() => {
    loadQuestions();
  }, [filterSource, filterTopic, filterDifficulty, filterLanguage, sourceType]);

  const handleAddToBank = async (question: TempQuestion) => {
    if (isLimitReached && !isSuperAdmin) {
      toast({
        title: "Limit Reached",
        description: `Your plan allows up to ${maxLimit} questions in the bank. Please upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    setAddingIds((prev) => new Set(prev).add(question.id));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      await QuestionBankService.addQuestion(user.id, {
        question: question.question,
        options: question.options,
        correct_option_index: question.correct_option_index,
        explanation: question.explanation,
        topic: question.topic,
        difficulty: question.difficulty as "easy" | "medium" | "hard",
        language: question.language as "bn" | "en" | "hi",
        source: "ai_generated",
        is_public: false,
        is_active: true,
      });

      // Remove from temporary storage
      TempQuestionStorageService.removeQuestion(question.id);
      loadQuestions();

      toast({
        title: "Added to Question Bank",
        description: "Question has been saved to your Question Bank",
      });

      onQuestionsAdded?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add question",
        variant: "destructive",
      });
    } finally {
      setAddingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(question.id);
        return newSet;
      });
    }
  };

  const handleAddAllToBank = async () => {
    if (isLimitReached && !isSuperAdmin) {
      toast({
        title: "Limit Reached",
        description: `Your plan allows up to ${maxLimit} questions in the bank. Please upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    if (maxLimit !== null && !isSuperAdmin && currentCount + questions.length > maxLimit) {
      toast({
        title: "Limit Exceeded",
        description: `Adding ${questions.length} questions would exceed your limit of ${maxLimit}. You can add ${maxLimit - currentCount} more.`,
        variant: "destructive",
      });
      return;
    }

    setSaveTarget('all');
    setSaveConfirmOpen(true);
  };

  const executeAddAllToBank = async () => {
    setAddingAll(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      const addPromises = questions.map((question) =>
        QuestionBankService.addQuestion(user.id, {
          question: question.question,
          options: question.options,
          correct_option_index: question.correct_option_index,
          explanation: question.explanation,
          topic: question.topic,
          difficulty: question.difficulty as "easy" | "medium" | "hard",
          language: question.language as "bn" | "en" | "hi",
          source: "ai_generated",
          is_public: false,
          is_active: true,
        })
      );

      await Promise.all(addPromises);

      // Remove all from temporary storage
      const ids = questions.map((q) => q.id);
      TempQuestionStorageService.removeQuestions(ids);
      loadQuestions();

      toast({
        title: "Success",
        description: `Added ${questions.length} questions to your Question Bank`,
      });

      onQuestionsAdded?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add questions",
        variant: "destructive",
      });
    } finally {
      setAddingAll(false);
    }
  };

  const handleDelete = (question: TempQuestion) => {
    setDeleteTarget(question.id);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = (id: string) => {
    try {
      TempQuestionStorageService.removeQuestion(id);
      loadQuestions();
      toast({
        title: "Removed",
        description: "Question removed from temporary list",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to remove question",
        variant: "destructive",
      });
    }
  };

  const getSourceIcon = (sourceType: string) => {
    return sourceType === "ai_generator" ? (
      <Sparkles className="w-4 h-4" />
    ) : (
      <FileText className="w-4 h-4" />
    );
  };

  const getSourceLabel = (sourceType: string) => {
    return sourceType === "ai_generator" ? "AI Generated" : "PDF Generated";
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteTarget('bulk');
    setDeleteConfirmOpen(true);
  };

  const executeBulkDelete = () => {
    try {
      setIsDeleting(true);
      const count = selectedIds.size;
      TempQuestionStorageService.removeQuestions(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadQuestions();
      toast({
        title: "Deleted",
        description: `${count} questions removed from list`,
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to delete questions",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkAddToBank = async () => {
    if (isLimitReached && !isSuperAdmin) {
      toast({
        title: "Limit Reached",
        description: `Your plan allows up to ${maxLimit} questions in the bank. Please upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    if (maxLimit !== null && !isSuperAdmin && currentCount + selectedIds.size > maxLimit) {
      toast({
        title: "Limit Exceeded",
        description: `Adding ${selectedIds.size} questions would exceed your limit of ${maxLimit}. You can add ${maxLimit - currentCount} more.`,
        variant: "destructive",
      });
      return;
    }

    setSaveTarget('bulk');
    setSaveConfirmOpen(true);
  };

  const executeBulkAddToBank = async () => {
    setAddingAll(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      const selectedQuestions = questions.filter(q => selectedIds.has(q.id));

      const addPromises = selectedQuestions.map((question) =>
        QuestionBankService.addQuestion(user.id, {
          question: question.question,
          options: question.options,
          correct_option_index: question.correct_option_index,
          explanation: question.explanation,
          topic: question.topic,
          difficulty: question.difficulty as "easy" | "medium" | "hard",
          language: question.language as "bn" | "en" | "hi",
          source: "ai_generated",
          is_public: false,
          is_active: true,
        })
      );

      await Promise.all(addPromises);

      // Remove added questions from temporary storage
      TempQuestionStorageService.removeQuestions(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadQuestions();

      toast({
        title: "Success",
        description: `Added ${selectedQuestions.length} questions to your Question Bank`,
      });

      onQuestionsAdded?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add questions",
        variant: "destructive",
      });
    } finally {
      setAddingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {sourceType === 'ai_generator' ? 'AI Generated Questions' :
                    sourceType === 'pdf_generator' ? 'PDF Generated Questions' : 'Generated Questions'}
                </CardTitle>
                <CardDescription>
                  Review and add generated questions to your Question Bank
                </CardDescription>
              </div>
              {questions.length > 0 && (
                <Button
                  onClick={handleAddAllToBank}
                  disabled={addingAll}
                  className="gap-2"
                >
                  {addingAll ? (
                    "Adding All..."
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Add All to Bank ({questions.length})
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Selection Controls */}
            {questions.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-generated"
                    checked={selectedIds.size === questions.length && questions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all-generated" className="text-sm font-medium cursor-pointer">
                    Select All ({questions.length})
                  </label>
                </div>

                {selectedIds.size > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size} selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearSelection}
                        className="gap-1"
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBulkAddToBank}
                        disabled={addingAll}
                        className="gap-1"
                      >
                        <Save className="w-3 h-3" />
                        Add Selected ({selectedIds.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Selected
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className={`grid grid-cols-1 ${sourceType ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 mb-6`}>
            {/* Only show source filter when not pre-filtered */}
            {!sourceType && (
              <div>
                <label className="text-sm font-medium mb-2 block">Source</label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="ai_generator">AI Generated</SelectItem>
                    <SelectItem value="pdf_generator">PDF Generated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Topic Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Topic</label>
              <Select value={filterTopic} onValueChange={setFilterTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {getUniqueTopics().map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty</label>
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Language</label>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="bn">Bengali</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Questions List or Empty State */}
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No AI Generated Questions</h3>
              <p className="text-muted-foreground mb-4">
                Generate questions using AI or PDF upload, and they will appear here before being saved
              </p>
              <p className="text-sm text-muted-foreground">
                Go to "AI Generate" or "PDF Generate" tabs to create questions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <Card
                  key={q.id}
                  className={`border-l-4 ${selectedIds.has(q.id) ? 'border-l-primary bg-primary/5' : 'border-l-muted-foreground/30'}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedIds.has(q.id)}
                          onCheckedChange={() => handleToggleSelect(q.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <CardTitle className="text-lg">{q.question}</CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="outline" className="gap-1">
                              {getSourceIcon(q.source_type)}
                              {getSourceLabel(q.source_type)}
                            </Badge>
                            <Badge variant="secondary">{q.topic}</Badge>
                            <Badge variant="secondary">{q.difficulty}</Badge>
                            <Badge variant="secondary">{q.language}</Badge>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleAddToBank(q)}
                          disabled={addingIds.has(q.id)}
                          className="gap-2"
                          size="sm"
                        >
                          {addingIds.has(q.id) ? (
                            "Adding..."
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add to Bank
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(q)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {q.options.map((option, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded border ${idx === q.correct_option_index
                            ? "bg-green-50 border-green-300 dark:bg-green-950/20 font-medium"
                            : ""
                            }`}
                        >
                          {idx === q.correct_option_index && (
                            <CheckCircle2 className="w-4 h-4 inline mr-2 text-green-600" />
                          )}
                          {option}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-4 p-3 bg-muted rounded">
                        <p className="text-sm">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'bulk'
                ? `This will remove ${selectedIds.size} selected questions from this temporary list. This action cannot be undone.`
                : "This will remove this question from this temporary list. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (deleteTarget === 'bulk') {
                  executeBulkDelete();
                } else if (deleteTarget) {
                  executeDelete(deleteTarget);
                }
                setDeleteTarget(null);
                setDeleteConfirmOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Question Bank</AlertDialogTitle>
            <AlertDialogDescription>
              {saveTarget === 'bulk'
                ? `Add ${selectedIds.size} selected questions to your Question Bank?`
                : `Add all ${questions.length} questions to your Question Bank?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaveTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (saveTarget === 'bulk') {
                  executeBulkAddToBank();
                } else if (saveTarget === 'all') {
                  executeAddAllToBank();
                }
                setSaveTarget(null);
                setSaveConfirmOpen(false);
              }}
            >
              Add to Bank
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
