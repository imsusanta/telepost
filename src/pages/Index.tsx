import { useState } from "react";
import { QuizConfigForm } from "@/components/QuizConfig";
import { QuizQuestion } from "@/components/QuizQuestion";
import { QuizResults } from "@/components/QuizResults";
import { TelegramShare } from "@/components/TelegramShare";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { UseCases } from "@/components/UseCases";
import { Footer } from "@/components/Footer";
import { ManualQuizInput } from "@/components/ManualQuizInput";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz, QuizConfig } from "@/types/quiz";

type AppState = "landing" | "config" | "quiz" | "results";

const Index = () => {
  const [state, setState] = useState<AppState>("landing");
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

      handleQuizCreated(data);
      toast.success("Quiz generated successfully!");
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizCreated = (createdQuiz: Quiz) => {
    setQuiz(createdQuiz);
    setSelectedAnswers(new Array(createdQuiz.questions.length).fill(null));
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsAnswered(false);
    setState("quiz");
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
    setState("landing");
  };

  const handleGetStarted = () => {
    setState("config");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white">
      <Navigation onGetStarted={handleGetStarted} />
      
      {state === "landing" && (
        <>
          <Hero onGetStarted={handleGetStarted} />
          
          <section className="py-12 px-4 border-y border-white/5 bg-white/5 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  { value: '50K+', label: 'Quizzes Created' },
                  { value: '10K+', label: 'Active Channels' },
                  { value: '2M+', label: 'Participants' },
                  { value: '4.9★', label: 'User Rating' }
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <Features />
          <UseCases />
          <Footer />
        </>
      )}

      {state === "config" && (
        <div className="min-h-screen pt-24 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="ai" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="ai">AI Generated</TabsTrigger>
                <TabsTrigger value="manual">Manual Input</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ai">
                <QuizConfigForm
                  onStartQuiz={handleStartQuiz}
                  isGenerating={isGenerating}
                />
              </TabsContent>
              
              <TabsContent value="manual">
                <ManualQuizInput
                  onQuizCreated={handleQuizCreated}
                  isGenerating={isGenerating}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {state === "quiz" && quiz && (
        <div className="min-h-screen flex flex-col items-center gap-6 p-4 pt-24">
          <div className="w-full max-w-3xl flex justify-between items-center">
            <Button
              onClick={handleNewQuiz}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
            >
              ← Back to Home
            </Button>
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
        <div className="min-h-screen flex items-center justify-center p-4 pt-24">
          <QuizResults
            score={score}
            totalQuestions={quiz.questions.length}
            quiz={quiz}
            onRestart={handleRestart}
            onNewQuiz={handleNewQuiz}
          />
        </div>
      )}
    </div>
  );
};

export default Index;