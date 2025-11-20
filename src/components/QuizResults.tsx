import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw, Trophy } from "lucide-react";
import { TelegramShare } from "./TelegramShare";
import type { Quiz } from "@/types/quiz";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  quiz: Quiz;
  onRestart: () => void;
  onNewQuiz: () => void;
}

export const QuizResults = ({ score, totalQuestions, quiz, onRestart, onNewQuiz }: QuizResultsProps) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  const getPerformanceMessage = () => {
    if (percentage >= 90) return { message: "Outstanding!", emoji: "🎉" };
    if (percentage >= 70) return { message: "Great Job!", emoji: "🌟" };
    if (percentage >= 50) return { message: "Good Effort!", emoji: "👍" };
    return { message: "Keep Practicing!", emoji: "💪" };
  };

  const { message, emoji } = getPerformanceMessage();

  return (
    <Card className="w-full max-w-2xl p-8 shadow-[var(--shadow-card)] text-center">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-accent to-accent/80">
          <Trophy className="w-10 h-10 text-accent-foreground" />
        </div>
        <h2 className="text-4xl font-bold text-foreground mb-2">
          {message} {emoji}
        </h2>
        <p className="text-muted-foreground text-lg">Quiz Complete</p>
      </div>

      <div className="mb-8 p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-2">
          {percentage}%
        </div>
        <p className="text-lg text-foreground">
          You scored <span className="font-bold text-primary">{score}</span> out of{" "}
          <span className="font-bold">{totalQuestions}</span>
        </p>
      </div>

      <div className="space-y-3">
        <TelegramShare quiz={quiz} />
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onRestart}
            variant="outline"
            className="flex-1 h-12 text-base font-semibold"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={onNewQuiz}
            className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          >
            <Home className="w-5 h-5 mr-2" />
            New Quiz
          </Button>
        </div>
      </div>
    </Card>
  );
};