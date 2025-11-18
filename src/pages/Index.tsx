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
      const errorMsg = error instanceof Error
        ? error.message
        : "Failed to generate quiz. Please try again.";
      toast.error(errorMsg);
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
    <div className="min-h-screen w-full relative">
      <Navigation onGetStarted={handleGetStarted} />

      {state === "landing" && (
        <>
          <Hero onGetStarted={handleGetStarted} />

          <section className="py-16 px-4 relative">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { value: '500+', label: 'Coaching Institutes', gradient: 'from-primary to-accent' },
                  { value: '50K+', label: 'Active Students', gradient: 'from-secondary to-accent' },
                  { value: '2M+', label: 'Quizzes Taken', gradient: 'from-accent to-primary' },
                  { value: '98%', label: 'Engagement Rate', gradient: 'from-success to-secondary' }
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="text-center clay-card-hover bg-card/50 backdrop-blur-sm p-6 animate-scale-in"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className={`text-3xl md:text-4xl font-bold text-gradient bg-gradient-to-r ${stat.gradient}`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 font-medium">{stat.label}</div>
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
            <div className="clay-card bg-card/50 backdrop-blur-sm p-8 animate-scale-in">
              <h2 className="text-3xl font-bold text-gradient bg-gradient-to-r from-primary to-accent mb-2 text-center">
                Create Your Quiz
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                Choose how you'd like to create your quiz
              </p>
              <Tabs defaultValue="ai" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 clay-card bg-muted/50 p-1.5 h-auto">
                  <TabsTrigger value="ai" className="rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-clay transition-all">
                    AI Generated
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="rounded-2xl py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-clay transition-all">
                    Manual Input
                  </TabsTrigger>
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
        </div>
      )}

      {state === "quiz" && quiz && (
        <div className="min-h-screen flex flex-col items-center gap-6 p-4 pt-24">
          <div className="w-full max-w-3xl flex justify-between items-center">
            <Button
              onClick={handleNewQuiz}
              variant="outline"
              size="sm"
              className="clay-button bg-card/50 border-border hover:bg-card"
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
            <div className="flex gap-4 animate-slide-up">
              {currentQuestionIndex > 0 && (
                <Button
                  onClick={handlePreviousQuestion}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px] clay-button bg-card/50 border-border"
                >
                  Previous Question
                </Button>
              )}
              <Button
                onClick={handleNextQuestion}
                size="lg"
                className="min-w-[200px] clay-button bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold"
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