import { useState, useEffect, useCallback } from "react";
import { Database, Filter, RefreshCw, Search, Trash2, Sparkles, FileText, List, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { QuestionBankService, QuestionBankItem, QuestionBankFilters } from "@/services/questionBankService";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { AddQuestionDialog } from "@/components/AddQuestionDialog";
import { AIQuestionGenerator } from "@/components/AIQuestionGenerator";
import { PDFQuestionGenerator } from "@/components/PDFQuestionGenerator";
import { QuestionSelectionDialog } from "@/components/QuestionSelectionDialog";
import { AIGeneratedQuestionsList } from "@/components/AIGeneratedQuestionsList";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TelegramShareQuestionBank } from "@/components/TelegramShareQuestionBank";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { ParsedQuestion } from "@/utils/questionParser";

export default function QuestionBank() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<QuestionBankFilters>({
    includePublic: true,
  });
  const [stats, setStats] = useState<{
    total: number;
    byTopic: Record<string, number>;
    byLanguage: Record<string, number>;
  } | null>(null);
  interface GeneratedQuestion {
    question: string;
    options: string[];
    correct_option_index: number;
    explanation?: string;
  }
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [defaultTopic, setDefaultTopic] = useState("");
  const [defaultDifficulty, setDefaultDifficulty] = useState("medium");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadQuestions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await QuestionBankService.getQuestions(user.id, filters, 100);
      setQuestions(data);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const loadStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const statistics = await QuestionBankService.getStatistics(user.id);
      setStats(statistics);
    } catch (error: unknown) {
      toast({
        title: "Warning",
        description: "Failed to load statistics",
        variant: "default",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadQuestions();
    loadStats();
  }, [loadQuestions, loadStats]);

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters({ ...filters, [key]: value || undefined });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadQuestions();
    await loadStats();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Question bank updated",
    });
  };

  const handleDelete = async (questionId: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await QuestionBankService.deleteQuestion(questionId, user.id);
      setQuestions(questions.filter(q => q.id !== questionId));
      toast({
        title: "Deleted",
        description: "Question deleted successfully",
      });
      loadStats();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const handleQuestionsGenerated = (generatedQs: GeneratedQuestion[], topic?: string, difficulty?: string, language?: string) => {
    setGeneratedQuestions(generatedQs);
    setDefaultTopic(topic || "");
    setDefaultDifficulty(difficulty || "medium");
    setDefaultLanguage(language || "en");
    setShowSelectionDialog(true);
  };

  const handleQuestionsSaved = async () => {
    setGeneratedQuestions([]);
    await loadQuestions();
    await loadStats();
  };

  const handleBulkUpload = async (questions: ParsedQuestion[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload questions.",
          variant: "destructive",
        });
        return;
      }

      const formattedQuestions = questions.map(q => ({
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        topic: "Bulk Upload",
        difficulty: "medium",
        language: "bn", // Default as per parser support for bilingual text
        is_public: false,
        is_active: true
      }));

      await QuestionBankService.bulkAddQuestions(user.id, formattedQuestions);

      toast({
        title: "Success",
        description: `Successfully uploaded ${questions.length} questions to the bank.`,
      });

      await handleRefresh();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during bulk upload.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Question selection handlers
  const handleToggleQuestion = (questionId: string) => {
    const newSelection = new Set(selectedQuestionIds);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestionIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      // Deselect all
      setSelectedQuestionIds(new Set());
    } else {
      // Select all filtered questions
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedQuestionIds(new Set());
  };

  const getSelectedQuestions = () => {
    return questions.filter(q => selectedQuestionIds.has(q.id));
  };

  // Filter questions by search query
  const filteredQuestions = questions.filter(q =>
    searchQuery === "" ||
    q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Database className="w-10 h-10" />
              Question Bank
            </h1>
            <p className="text-muted-foreground">
              {stats?.total || 0} questions available
              {searchQuery && ` (${filteredQuestions.length} matching)`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="questions" className="gap-2">
              <List className="w-4 h-4" />
              My Questions
            </TabsTrigger>
            <TabsTrigger value="ai-questions" className="gap-2">
              <Zap className="w-4 h-4" />
              AI Generated
            </TabsTrigger>
            <TabsTrigger value="ai-generate" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="pdf-generate" className="gap-2">
              <FileText className="w-4 h-4" />
              PDF Generate
            </TabsTrigger>
          </TabsList>

          {/* My Questions Tab */}
          <TabsContent value="questions" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <BulkUploadDialog onUpload={handleBulkUpload} />
                <AddQuestionDialog onQuestionAdded={handleRefresh} />
                <TelegramShareQuestionBank
                  selectedQuestions={getSelectedQuestions()}
                  onClearSelection={handleClearSelection}
                />
              </div>
            </div>

            {/* Selection Controls */}
            {filteredQuestions.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All
                  </label>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedQuestionIds.size > 0 ? (
                    <span className="font-medium text-primary">
                      {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} selected
                    </span>
                  ) : (
                    <span>No questions selected</span>
                  )}
                </div>
              </div>
            )}

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Source</label>
                    <Select
                      value={filters.source || "all"}
                      onValueChange={(value) => handleFilterChange("source", value === "all" ? null : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="ai_generated">AI Generated</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="quiz_import">Quiz Import</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Difficulty</label>
                    <Select
                      value={filters.difficulty || "all"}
                      onValueChange={(value) => handleFilterChange("difficulty", value === "all" ? null : value)}
                    >
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
                    <Select
                      value={filters.language || "all"}
                      onValueChange={(value) => handleFilterChange("language", value === "all" ? null : value)}
                    >
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

                  <div>
                    <label className="text-sm font-medium mb-2 block">Topic</label>
                    <Input
                      placeholder="Filter by topic"
                      value={filters.topic || ""}
                      onChange={(e) => handleFilterChange("topic", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input
                      placeholder="Filter by subject"
                      value={filters.subject || ""}
                      onChange={(e) => handleFilterChange("subject", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{Object.keys(stats.byTopic).length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Languages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{Object.keys(stats.byLanguage).length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Average Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {stats.total > 0
                        ? Math.round(
                          questions.reduce((sum, q) => sum + q.times_used, 0) / stats.total
                        )
                        : 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Questions List */}
            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <Skeleton key={j} className="h-10 w-full" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredQuestions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {searchQuery ? "No matching questions" : "No questions found"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? "Try adjusting your search or filters"
                      : "Add questions manually or import from quizzes and documents"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredQuestions.map((q) => (
                  <Card key={q.id} className={selectedQuestionIds.has(q.id) ? "ring-2 ring-primary" : ""}>
                    <CardHeader>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            id={`question-${q.id}`}
                            checked={selectedQuestionIds.has(q.id)}
                            onCheckedChange={() => handleToggleQuestion(q.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <CardTitle className="text-lg">{q.question}</CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                              <span>{q.topic} • {q.difficulty} • {q.language} • Used {q.times_used} times</span>
                              {q.source && (
                                <Badge variant="outline" className="text-xs">
                                  {q.source === 'ai_generated' ? 'AI Generated' :
                                    q.source === 'manual' ? 'Manual' :
                                      q.source === 'document' ? 'Document' :
                                        q.source === 'quiz_import' ? 'Quiz Import' : q.source}
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {q.is_public && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              Public
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(q.id)}
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
                            className={`p-2 rounded border ${idx === q.correct_option_index
                              ? "bg-green-50 border-green-300 dark:bg-green-950/20"
                              : ""
                              }`}
                          >
                            {idx === q.correct_option_index && "✓ "}
                            {option}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-3 text-sm text-muted-foreground italic">
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AI Generated Questions Tab */}
          <TabsContent value="ai-questions" className="space-y-6 mt-6">
            <AIGeneratedQuestionsList onQuestionsAdded={handleRefresh} />
          </TabsContent>

          {/* AI Generate Tab */}
          <TabsContent value="ai-generate" className="space-y-6 mt-6">
            <AIQuestionGenerator
              onQuestionsGenerated={(questions) => handleQuestionsGenerated(questions)}
            />
          </TabsContent>

          {/* PDF Generate Tab */}
          <TabsContent value="pdf-generate" className="space-y-6 mt-6">
            <PDFQuestionGenerator
              onQuestionsGenerated={(questions) => handleQuestionsGenerated(questions)}
            />
          </TabsContent>
        </Tabs>

        {/* Question Selection Dialog */}
        <QuestionSelectionDialog
          open={showSelectionDialog}
          onOpenChange={setShowSelectionDialog}
          questions={generatedQuestions}
          defaultTopic={defaultTopic}
          defaultDifficulty={defaultDifficulty}
          defaultLanguage={defaultLanguage}
          onSaved={handleQuestionsSaved}
        />
      </div>
    </DashboardLayout>
  );
}
