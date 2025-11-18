import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Database, Search, Filter, Plus } from "lucide-react";
import { QuestionBankService, QuestionBankItem, QuestionBankFilters } from "@/services/questionBankService";
import { supabase } from "@/integrations/supabase/client";

export default function QuestionBank() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<QuestionBankFilters>({
    includePublic: true,
  });
  const [stats, setStats] = useState<any>(null);
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
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value || undefined });
  };

  const handleAddQuestion = () => {
    toast({
      title: "Add Question",
      description: "To add questions, create a quiz and save individual questions to your question bank.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Database className="w-10 h-10" />
              Question Bank
            </h1>
            <p className="text-muted-foreground">
              {stats?.total || 0} questions available
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddQuestion}>
            <Plus className="w-4 h-4" />
            Add Question
          </Button>
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
          <div className="text-center py-12">Loading questions...</div>
        ) : questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No questions found</h3>
              <p className="text-muted-foreground mb-4">
                Add questions manually or import from quizzes and documents
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {questions.map((q) => (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{q.question}</CardTitle>
                      <CardDescription>
                        {q.topic} • {q.difficulty} • {q.language} • Used {q.times_used} times
                      </CardDescription>
                    </div>
                    {q.is_public && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        Public
                      </span>
                    )}
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
      </div>
    </DashboardLayout>
  );
}
