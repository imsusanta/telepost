import { useState } from "react";
import { QuizConfigForm } from "@/components/QuizConfig";
import { QuizQuestion } from "@/components/QuizQuestion";
import { QuizResults } from "@/components/QuizResults";
import { TelegramShare } from "@/components/TelegramShare";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz, QuizConfig } from "@/types/quiz";

type AppState = "config" | "quiz" | "results";

const Index = () => {
  const [state, setState] = useState<AppState>("config");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartQuiz = async (config: QuizConfig) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: config,
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setQuiz(data);
      setSelectedAnswers(new Array(data.questions.length).fill(null));
      setCurrentQuestionIndex(0);
      setScore(0);
      setIsAnswered(false);
      setState("quiz");
      toast.success("Quiz generated successfully!");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    if (!quiz || isAnswered) return;

    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
    setIsAnswered(true);

    if (answerIndex === quiz.questions[currentQuestionIndex].correct_option_index) {
      setScore(score + 1);
      toast.success("Correct! 🎉");
    } else {
      toast.error("Incorrect. Try the next one!");
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setIsAnswered(selectedAnswers[prevIndex] !== null);
    }
  };

  const handleNextQuestion = () => {
    if (!quiz) return;

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setIsAnswered(false);
    } else {
      setState("results");
    }
  };

  const handleRestart = () => {
    if (!quiz) return;
    setCurrentQuestionIndex(0);
    setSelectedAnswers(new Array(quiz.questions.length).fill(null));
    setScore(0);
    setIsAnswered(false);
    setState("quiz");
  };

  const handleNewQuiz = () => {
    setQuiz(null);
    setState("config");
  };

  return (
    <div className="min-h-screen w-full bg-[var(--gradient-bg)] flex flex-col items-center justify-center p-4">
      {state === "config" && (
        <QuizConfigForm onStartQuiz={handleStartQuiz} isGenerating={isGenerating} />
      )}

      {state === "quiz" && quiz && (
        <div className="w-full flex flex-col items-center gap-6">
          <div className="w-full max-w-3xl flex justify-end">
            <TelegramShare quiz={quiz} />
          </div>
          <QuizQuestion
            question={quiz.questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={quiz.questions.length}
            selectedAnswer={selectedAnswers[currentQuestionIndex]}
            isAnswered={isAnswered}
            onSelectAnswer={handleSelectAnswer}
          />
          {isAnswered && (
            <div className="flex gap-4">
              {currentQuestionIndex > 0 && (
                <Button
                  onClick={handlePreviousQuestion}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px]"
                >
                  Previous Question
                </Button>
              )}
              <Button
                onClick={handleNextQuestion}
                size="lg"
                className="min-w-[200px] bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-accent-foreground font-semibold"
              >
                {currentQuestionIndex < quiz.questions.length - 1 ? "Next Question" : "See Results"}
              </Button>
            </div>
          )}
        </div>
      )}

      {state === "results" && quiz && (
        <QuizResults
          score={score}
          totalQuestions={quiz.questions.length}
          quiz={quiz}
          onRestart={handleRestart}
          onNewQuiz={handleNewQuiz}
        />
      )}
    </div>
  );
};

export default Index;