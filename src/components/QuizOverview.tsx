import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Quiz } from "@/types/quiz";

interface QuizOverviewProps {
  quiz: Quiz;
}

export const QuizOverview = ({ quiz }: QuizOverviewProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">{quiz.topic}</h2>
        <p className="text-muted-foreground">
          {quiz.questions.length} questions ready to share
        </p>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((question, index) => (
          <Card key={index} className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-start gap-3">
                <Badge variant="outline" className="shrink-0">
                  Q{index + 1}
                </Badge>
                <span>{question.question}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {question.options.map((option, optIndex) => (
                  <div
                    key={optIndex}
                    className={`p-3 rounded-lg border ${
                      optIndex === question.correct_option_index
                        ? "bg-green-500/10 border-green-500/50"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {optIndex === question.correct_option_index && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      )}
                      <span className="text-sm">{option}</span>
                    </div>
                  </div>
                ))}
              </div>
              {question.explanation && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Explanation: </span>
                    {question.explanation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
