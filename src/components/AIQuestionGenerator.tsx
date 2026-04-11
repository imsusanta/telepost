import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { QuizService } from "@/services/quizService";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { TempQuestionStorageService } from "@/services/tempQuestionStorage";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Question {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

interface AIQuestionGeneratorProps {
  onQuestionsGenerated: (questions: Question[], topic?: string, difficulty?: string, language?: string) => void;
  currentCount?: number;
}

export function AIQuestionGenerator({ onQuestionsGenerated, currentCount = 0 }: AIQuestionGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [language, setLanguage] = useState<"bn" | "en" | "hi">("en");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { getLimit, isSuperAdmin } = useSubscription();
  const maxLimit = getLimit('max_question_bank_size');
  const isLimitReached = maxLimit !== null && currentCount >= maxLimit;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic",
        variant: "destructive",
      });
      return;
    }

    if (questionCount < 1 || questionCount > 50) {
      toast({
        title: "Error",
        description: "Question count must be between 1 and 50",
        variant: "destructive",
      });
      return;
    }

    if (isLimitReached && !isSuperAdmin) {
      toast({
        title: "Limit Reached",
        description: `Your plan allows up to ${maxLimit} questions in the bank. Please upgrade to generate more.`,
        variant: "destructive",
      });
      return;
    }

    if (maxLimit !== null && !isSuperAdmin && currentCount + questionCount > maxLimit) {
      toast({
        title: "Limit Exceeded",
        description: `Generating ${questionCount} questions would exceed your limit of ${maxLimit}. You can add ${maxLimit - currentCount} more.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      // Generate quiz using the existing quiz service
      const quiz = await QuizService.generateQuiz({
        topic: topic.trim(),
        questionCount,
        difficulty,
        language,
        systemPrompt: customPrompt.trim() || undefined,
        userId: user.id,
      });

      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw new Error("No questions generated");
      }

      // Store questions temporarily
      TempQuestionStorageService.addQuestions(quiz.questions, {
        topic: topic.trim(),
        difficulty,
        language,
        source_type: 'ai_generator',
      });

      // Pass generated questions to parent with metadata (for backward compatibility)
      onQuestionsGenerated(quiz.questions, topic.trim(), difficulty, language);

      toast({
        title: "Success",
        description: `Generated ${quiz.questions.length} questions! View them in the "AI Generated" tab.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate questions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Question Generation
        </CardTitle>
        <CardDescription>
          Generate multiple choice questions on any topic using AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLimitReached && !isSuperAdmin && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limit Reached</AlertTitle>
            <AlertDescription>
              You have {currentCount} questions. Your {maxLimit}-question limit is reached.
              Please upgrade your plan to generate more.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic *</Label>
            <Input
              id="topic"
              placeholder="e.g., World War II, Python Programming, Photosynthesis"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}
                disabled={isGenerating}
              >
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as "bn" | "en" | "hi")}
                disabled={isGenerating}
              >
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

          <div className="space-y-2">
            <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
            <Textarea
              id="customPrompt"
              placeholder="Add specific instructions for question generation (e.g., focus on dates, include diagrams, etc.)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isGenerating}
              rows={3}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (isLimitReached && !isSuperAdmin)}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Questions...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Questions
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
