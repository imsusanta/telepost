import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuizQuestion as QuizQuestionType } from "@/types/quiz";

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  isAnswered: boolean;
  onSelectAnswer: (index: number) => void;
}

export const QuizQuestion = ({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  isAnswered,
  onSelectAnswer,
}: QuizQuestionProps) => {
  return (
    <Card className="w-full max-w-3xl p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </span>
          <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-foreground">{question.question}</h3>
      </div>

      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correct_option_index;
          const showResult = isAnswered;

          return (
            <Button
              key={index}
              onClick={() => !isAnswered && onSelectAnswer(index)}
              disabled={isAnswered}
              variant="outline"
              className={cn(
                "w-full h-auto min-h-[60px] p-4 text-left justify-start items-center gap-3 transition-all",
                "hover:border-primary/50 hover:bg-secondary/50",
                !showResult && isSelected && "border-primary bg-secondary",
                showResult && isCorrect && "border-success bg-success/10 hover:bg-success/10",
                showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10 hover:bg-destructive/10"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 transition-all",
                  !showResult && "border-border",
                  !showResult && isSelected && "border-primary bg-primary/10",
                  showResult && isCorrect && "border-success bg-success",
                  showResult && isSelected && !isCorrect && "border-destructive bg-destructive"
                )}
              >
                {showResult && isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-success-foreground" />
                ) : showResult && isSelected && !isCorrect ? (
                  <XCircle className="w-5 h-5 text-destructive-foreground" />
                ) : (
                  <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {String.fromCharCode(65 + index)}
                  </span>
                )}
              </div>
              <span className="text-base flex-1">{option}</span>
            </Button>
          );
        })}
      </div>

      {isAnswered && question.explanation && (
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-1">Explanation</p>
          <p className="text-sm text-foreground">{question.explanation}</p>
        </div>
      )}
    </Card>
  );
};