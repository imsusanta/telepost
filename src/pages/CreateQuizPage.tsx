import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { QuizConfigForm } from "@/components/QuizConfig";
import { ManualQuizInput } from "@/components/ManualQuizInput";
import { TelegramShare } from "@/components/TelegramShare";
import { QuizOverview } from "@/components/QuizOverview";
import { Quiz, QuizConfig as QuizConfigType } from "@/types/quiz";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreateQuizPage() {
  const { toast } = useToast();
  const [state, setState] = useState<"config" | "overview">("config");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
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
      setState("overview");
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
    setState("overview");
  };

  const handleNewQuiz = () => {
    setState("config");
    setQuiz(null);
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

        {state === "overview" && quiz && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleNewQuiz}
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
