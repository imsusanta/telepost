import { useState, useEffect } from "react";
import { Database, Filter, RefreshCw, Search, Trash2, Sparkles, FileText, List } from "lucide-react";
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

export default function QuestionBank() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<QuestionBankFilters>({
    includePublic: true,
  });
  const [stats, setStats] = useState<any>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [defaultTopic, setDefaultTopic] = useState("");
  const [defaultDifficulty, setDefaultDifficulty] = useState("medium");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const { toast } = useToast();

  useEffect(() => {
    loadQuestions();
    loadStats();
  }, [filters]);

  const loadQuestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await QuestionBankService.getQuestions(user.id, filters, 100);
      setQuestions(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const statistics = await QuestionBankService.getStatistics(user.id);
      setStats(statistics);
    } catch (error: any) {
      toast({
        title: "Warning",
        description: "Failed to load statistics",
        variant: "default",
      });
    }
  };

  const handleFilterChange = (key: string, value: any) => {
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleQuestionsGenerated = (generatedQs: any[], topic?: string, difficulty?: string, language?: string) => {
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions" className="gap-2">
              <List className="w-4 h-4" />
              My Questions
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
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <AddQuestionDialog onQuestionAdded={handleRefresh} />
            </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{q.question}</CardTitle>
                      <CardDescription>
                        {q.topic} • {q.difficulty} • {q.language} • Used {q.times_used} times
                      </CardDescription>
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
                        className={`p-2 rounded border ${
                          idx === q.correct_option_index
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
