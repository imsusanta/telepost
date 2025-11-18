import { useState } from "react";
import { QuizService } from "@/services/quizService";
import { Quiz, QuizConfig } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";

export function useQuizGeneration() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateQuiz = async (config: QuizConfig) => {
    setIsGenerating(true);
    try {
      const generatedQuiz = await QuizService.generateQuiz(config);
      setQuiz(generatedQuiz);
      toast({
        title: "Quiz Generated",
        description: `Successfully generated ${generatedQuiz.questions.length} questions`,
      });
      return generatedQuiz;
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate quiz",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const resetQuiz = () => {
    setQuiz(null);
  };

  return {
    quiz,
    isGenerating,
    generateQuiz,
    resetQuiz,
    setQuiz,
  };
}
