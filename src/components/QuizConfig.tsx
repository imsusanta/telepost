import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { QuizConfig } from "@/types/quiz";

interface QuizConfigProps {
  onStartQuiz: (config: QuizConfig) => void;
  isGenerating: boolean;
}

export const QuizConfigForm = ({ onStartQuiz, isGenerating }: QuizConfigProps) => {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStartQuiz({
        topic: topic.trim(),
        questionCount: parseInt(questionCount),
        difficulty,
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-primary to-primary/80">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Create Your Quiz</h2>
        <p className="text-muted-foreground">Generate AI-powered quizzes on any topic</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-medium">
            Quiz Topic
          </Label>
          <Input
            id="topic"
            placeholder="e.g., World History, JavaScript, Biology..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="count" className="text-sm font-medium">
              Number of Questions
            </Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger id="count" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Questions</SelectItem>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty" className="text-sm font-medium">
              Difficulty Level
            </Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
              <SelectTrigger id="difficulty" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!topic.trim() || isGenerating}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Quiz
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};