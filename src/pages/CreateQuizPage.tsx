import DashboardLayout from "@/components/DashboardLayout";
import { QuizConfigForm } from "@/components/QuizConfig";
import { ManualQuizInput } from "@/components/ManualQuizInput";
import { TelegramShare } from "@/components/TelegramShare";
import { QuizOverview } from "@/components/QuizOverview";
import { QuizConfig as QuizConfigType } from "@/types/quiz";
import { useQuizGeneration } from "@/hooks/useQuizGeneration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";

export default function CreateQuizPage() {
  const { quiz, isGenerating, generateQuiz, resetQuiz, setQuiz } = useQuizGeneration();

  const handleStartQuiz = async (config: QuizConfigType) => {
    await generateQuiz(config);
  };

  const handleQuizCreated = (createdQuiz: any) => {
    setQuiz(createdQuiz);
  };

  if (isGenerating) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <LoadingState message="Generating your quiz with AI..." size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {!quiz ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Create Quiz</h1>
                <p className="text-muted-foreground">Generate AI-powered quizzes or create your own</p>
              </div>
            </div>

            <Tabs defaultValue="ai" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Generated
                </TabsTrigger>
                <TabsTrigger value="manual">Manual Input</TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="animate-in fade-in duration-300">
                <QuizConfigForm onStartQuiz={handleStartQuiz} isGenerating={isGenerating} />
              </TabsContent>

              <TabsContent value="manual" className="animate-in fade-in duration-300">
                <ManualQuizInput onQuizCreated={handleQuizCreated} isGenerating={false} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={resetQuiz}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Create New Quiz
              </Button>
              <TelegramShare quiz={quiz} />
            </div>
            <QuizOverview quiz={quiz} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
