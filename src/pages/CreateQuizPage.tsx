import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { QuizConfigForm } from "@/components/QuizConfig";
import { QuizQuestion } from "@/components/QuizQuestion";
import { QuizResults } from "@/components/QuizResults";
import { ManualQuizInput } from "@/components/ManualQuizInput";
import { TelegramShare } from "@/components/TelegramShare";
import { Quiz, QuizConfig as QuizConfigType } from "@/types/quiz";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function CreateQuizPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<"config" | "quiz" | "results">("config");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartQuiz = async (config: QuizConfigType) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: config,
      });

      if (error) throw error;

      const generatedQuiz: Quiz = data;
      setQuiz(generatedQuiz);
      setState("quiz");
      setCurrentQuestionIndex(0);
      setAnswers({});
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quiz",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizCreated = (createdQuiz: Quiz) => {
    setQuiz(createdQuiz);
    setState("quiz");
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const handleSelectAnswer = (answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: answerIndex }));

    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }, 500);
    } else {
      setTimeout(() => {
        setState("results");
      }, 500);
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setState("quiz");
  };

  const handleNewQuiz = () => {
    setState("config");
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correct_option_index) {
        score++;
      }
    });
    return score;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {state === "config" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Create Quiz</h1>
              <p className="text-gray-400">Generate AI-powered quizzes or paste your own</p>
            </div>

            <Tabs defaultValue="ai" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ai">AI Generated</TabsTrigger>
                <TabsTrigger value="manual">Manual Input</TabsTrigger>
              </TabsList>

              <TabsContent value="ai">
                <QuizConfigForm onStartQuiz={handleStartQuiz} isGenerating={isGenerating} />
              </TabsContent>

              <TabsContent value="manual">
                <ManualQuizInput onQuizCreated={handleQuizCreated} isGenerating={false} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {state === "quiz" && quiz && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <TelegramShare quiz={quiz} />
            </div>
            <QuizQuestion
              question={quiz.questions[currentQuestionIndex]}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={quiz.questions.length}
              selectedAnswer={answers[currentQuestionIndex] ?? null}
              isAnswered={answers[currentQuestionIndex] !== undefined}
              onSelectAnswer={handleSelectAnswer}
            />
            {answers[currentQuestionIndex] !== undefined && currentQuestionIndex < quiz.questions.length - 1 && (
              <div className="text-center">
                <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                  Next Question
                </Button>
              </div>
            )}
          </div>
        )}

        {state === "results" && quiz && (
          <QuizResults
            score={calculateScore()}
            totalQuestions={quiz.questions.length}
            quiz={quiz}
            onRestart={handleRestart}
            onNewQuiz={handleNewQuiz}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
