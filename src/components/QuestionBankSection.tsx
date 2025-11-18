import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  QuestionBankService,
  QuestionBankItem,
  QuestionBankFilters,
} from "@/services/questionBankService";
import { Database, CheckCircle2, Filter, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface QuestionBankSectionProps {
  channelId?: string;
  selectedQuestionIds?: string[];
  onQuestionSelect?: (questionId: string) => void;
  onQuestionToggle?: (questionId: string) => void;
  multiSelect?: boolean;
  compact?: boolean;
}

export const QuestionBankSection = ({
  channelId,
  selectedQuestionIds = [],
  onQuestionSelect,
  onQuestionToggle,
  multiSelect = false,
  compact = true,
}: QuestionBankSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<QuestionBankFilters>({
    includePublic: true,
  });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadQuestions();
      loadStats();
    }
  }, [user, channelId, filters]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await QuestionBankService.getQuestions(user!.id, filters, 50);

      // Filter by channel if provided
      const filteredQuestions = channelId
        ? data.filter((q) => q.channel_id === channelId)
        : data;

      setQuestions(filteredQuestions);
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
      const statistics = await QuestionBankService.getStatistics(user!.id);
      setStats(statistics);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value || undefined });
  };

  const handleQuestionClick = (questionId: string) => {
    if (multiSelect) {
      onQuestionToggle?.(questionId);
    } else {
      onQuestionSelect?.(questionId);
    }
  };

  const isSelected = (questionId: string) => {
    return selectedQuestionIds.includes(questionId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Question Bank</h4>
          <p className="text-xs text-muted-foreground">
            {stats?.total || 0} questions available
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-3 h-3 mr-1" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <Card className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block">Difficulty</label>
              <Select
                value={filters.difficulty || "all"}
                onValueChange={(value) =>
                  handleFilterChange("difficulty", value === "all" ? null : value)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Language</label>
              <Select
                value={filters.language || "all"}
                onValueChange={(value) =>
                  handleFilterChange("language", value === "all" ? null : value)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">Bengali</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {questions.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <div className="flex flex-col items-center gap-2">
            <Database className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No questions found. Try adjusting filters or add new questions.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {questions.map((question) => (
            <Card
              key={question.id}
              className={`p-3 cursor-pointer transition-all ${
                isSelected(question.id)
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent"
              }`}
              onClick={() => handleQuestionClick(question.id)}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-medium line-clamp-2">
                      {question.question}
                    </p>
                    {isSelected(question.id) && (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </Badge>

                    {question.topic && (
                      <Badge variant="secondary" className="text-xs">
                        {question.topic}
                      </Badge>
                    )}

                    {question.language && (
                      <Badge variant="outline" className="text-xs">
                        {question.language.toUpperCase()}
                      </Badge>
                    )}

                    {question.times_used > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        <span>{question.times_used} uses</span>
                      </div>
                    )}
                  </div>

                  {question.explanation && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                      {question.explanation}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {multiSelect && selectedQuestionIds.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">
            {selectedQuestionIds.length} question(s) selected
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => selectedQuestionIds.forEach((id) => onQuestionToggle?.(id))}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
};
