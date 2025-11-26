import { useState, useEffect } from "react";
import { Plus, Trash2, Sparkles, FileText, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TempQuestionStorageService, TempQuestion } from "@/services/tempQuestionStorage";
import { QuestionBankService } from "@/services/questionBankService";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AIGeneratedQuestionsListProps {
  onQuestionsAdded?: () => void;
}

export function AIGeneratedQuestionsList({ onQuestionsAdded }: AIGeneratedQuestionsListProps) {
  const [questions, setQuestions] = useState<TempQuestion[]>([]);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addingAll, setAddingAll] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const { toast } = useToast();

  const loadQuestions = () => {
    const filters: any = {};
    if (filterSource !== "all") {
      filters.source_type = filterSource;
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
  }, [filterSource, filterDifficulty, filterLanguage]);

  const handleAddToBank = async (question: TempQuestion) => {
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
        user_id: user.id,
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
    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: "There are no AI generated questions to add",
        variant: "destructive",
      });
      return;
    }

    if (!window.confirm(`Add all ${questions.length} questions to your Question Bank?`)) {
      return;
    }

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
          user_id: user.id,
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
    if (!window.confirm("Remove this question from the list?")) {
      return;
    }

    try {
      TempQuestionStorageService.removeQuestion(question.id);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Generated Questions
              </CardTitle>
              <CardDescription>
                Review and add AI generated questions to your Question Bank
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
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <Card key={q.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
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
                          className={`p-3 rounded border ${
                            idx === q.correct_option_index
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
    </div>
  );
}
