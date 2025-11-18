import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuizService } from "@/services/quizService";
import { SubscriptionService } from "@/services/subscriptionService";
import { Quiz, QuizConfig } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

export function useQuizGeneration() {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const requestTimestamps = useRef<number[]>([]);
  const { toast } = useToast();

  // Check rate limiting
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    // Remove timestamps outside the window
    requestTimestamps.current = requestTimestamps.current.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
    );

    if (requestTimestamps.current.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestTimestamp = requestTimestamps.current[0];
      const waitTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 1000);
      toast({
        title: "Rate Limited",
        description: `Please wait ${waitTime} seconds before generating another quiz`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [toast]);

  // Validate quiz configuration
  const validateConfig = useCallback((config: QuizConfig): string | null => {
    if (!config.topic || config.topic.trim().length < 2) {
      return "Please provide a valid topic (at least 2 characters)";
    }

    if (config.topic.length > 200) {
      return "Topic is too long (maximum 200 characters)";
    }

    if (!config.questionCount || config.questionCount < 1 || config.questionCount > 20) {
      return "Number of questions must be between 1 and 20";
    }

    if (!config.difficulty || !['easy', 'medium', 'hard'].includes(config.difficulty)) {
      return "Please select a valid difficulty level (easy, medium, or hard)";
    }

    return null;
  }, []);

  const generateQuiz = async (config: QuizConfig) => {
    // Validate configuration
    const validationError = validateConfig(config);
    if (validationError) {
      toast({
        title: "Invalid Configuration",
        description: validationError,
        variant: "destructive",
      });
      throw new Error(validationError);
    }

    // Check rate limiting
    if (!checkRateLimit()) {
      throw new Error("Rate limited");
    }

    // Already generating
    if (isGenerating) {
      toast({
        title: "Please Wait",
        description: "A quiz is already being generated",
        variant: "destructive",
      });
      throw new Error("Already generating");
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to generate quizzes");
      }

      // Check subscription limits
      const canGenerate = await SubscriptionService.canUserPerformAction(user.id, "generate_quiz");
      if (!canGenerate.allowed) {
        toast({
          title: "Limit Reached",
          description: canGenerate.reason || "You've reached your quiz generation limit. Please upgrade your plan.",
          variant: "destructive",
        });
        throw new Error(canGenerate.reason || "Generation limit reached");
      }

      // Record this request for rate limiting
      requestTimestamps.current.push(Date.now());

      const generatedQuiz = await QuizService.generateQuiz({
        ...config,
        userId: user.id,
      });

      setQuiz(generatedQuiz);
      setGenerationCount((prev) => prev + 1);

      const knowledgeBaseNote = config.useChannelKnowledgeBase
        ? " using channel knowledge base"
        : "";

      toast({
        title: "Quiz Generated",
        description: `Successfully generated ${generatedQuiz.questions.length} questions${knowledgeBaseNote}`,
      });
      return generatedQuiz;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate quiz";
      // Only show toast if not already shown
      if (!message.includes("Rate limited") &&
          !message.includes("Already generating") &&
          !message.includes("limit")) {
        toast({
          title: "Generation Failed",
          description: message,
          variant: "destructive",
        });
      }
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
    generationCount,
    generateQuiz,
    resetQuiz,
    setQuiz,
  };
}
