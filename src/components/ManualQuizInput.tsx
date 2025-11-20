import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, FileText, Send } from "lucide-react";
import { Quiz, QuizQuestion } from '@/types/quiz';
import { useToast } from '@/hooks/use-toast';

interface ManualQuizInputProps {
  onQuizCreated: (quiz: Quiz) => void;
  isGenerating: boolean;
}

export function ManualQuizInput({ onQuizCreated, isGenerating }: ManualQuizInputProps) {
  const [mcqText, setMcqText] = useState('');
  const { toast } = useToast();

  const parseMCQ = (text: string): QuizQuestion[] => {
    const questions: QuizQuestion[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentQuestion: Partial<QuizQuestion> | null = null;
    let questionNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if it's a question (starts with number or "Q")
      if (/^(\d+[\.\)]\s*|Q\d+[\.\):\s]+)/i.test(line)) {
        // Save previous question if exists
        if (currentQuestion && currentQuestion.question && currentQuestion.options) {
          questions.push(currentQuestion as QuizQuestion);
        }
        
        // Start new question
        currentQuestion = {
          id: questionNumber++,
          question: line.replace(/^(\d+[\.\)]\s*|Q\d+[\.\):\s]+)/i, '').trim(),
          options: [],
          correct_option_index: 0
        };
      }
      // Check if it's an option (starts with a), b), A), B), or 1), 2), etc.)
      else if (/^[a-dA-D1-4][\.\)]\s*/i.test(line) && currentQuestion) {
        const optionText = line.replace(/^[a-dA-D1-4][\.\)]\s*/i, '').trim();
        
        // Check if this option is marked as correct (contains *, ✓, or (correct))
        const isCorrect = /\*|\✓|\(correct\)/i.test(optionText);
        const cleanOption = optionText.replace(/\*|\✓|\(correct\)/gi, '').trim();
        
        if (isCorrect && currentQuestion.options) {
          currentQuestion.correct_option_index = currentQuestion.options.length;
        }
        
        currentQuestion.options?.push(cleanOption);
      }
    }
    
    // Add the last question
    if (currentQuestion && currentQuestion.question && currentQuestion.options) {
      questions.push(currentQuestion as QuizQuestion);
    }
    
    return questions;
  };

  const handleCreateQuiz = () => {
    if (!mcqText.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste your MCQ questions',
        variant: 'destructive',
      });
      return;
    }

    try {
      const questions = parseMCQ(mcqText);
      
      if (questions.length === 0) {
        toast({
          title: 'Error',
          description: 'Could not parse any questions. Please check the format.',
          variant: 'destructive',
        });
        return;
      }

      // Validate questions
      const invalidQuestions = questions.filter(q => !q.options || q.options.length < 2);
      if (invalidQuestions.length > 0) {
        toast({
          title: 'Error',
          description: 'Some questions have less than 2 options. Please check your format.',
          variant: 'destructive',
        });
        return;
      }

      const quiz: Quiz = {
        request_id: `manual-${Date.now()}`,
        topic: 'Manual Quiz',
        questions,
        metadata: {
          difficulty: 'medium',
          generated_at: new Date().toISOString(),
        },
      };

      onQuizCreated(quiz);
      
      toast({
        title: 'Success',
        description: `Created ${questions.length} questions successfully!`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse MCQ. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-2xl font-bold">Manual MCQ Input</h2>
        </div>
        
        <p className="text-muted-foreground text-sm">
          Paste your multiple choice questions below. Format example:
        </p>
        
        <div className="bg-muted/50 p-3 rounded-lg text-sm font-mono space-y-1">
          <div>1. What is the capital of France?</div>
          <div>a) London</div>
          <div>b) Paris *</div>
          <div>c) Berlin</div>
          <div>d) Madrid</div>
        </div>

        <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Start each question with a number (1., 2., Q1, etc.)</p>
              <p>• Options should start with a), b), c), d) or 1), 2), 3), 4)</p>
              <p>• Mark correct answer with * or ✓ or (correct)</p>
              <p>• Each question needs at least 2 options</p>
            </div>
          </div>
        </div>

        <Textarea
          placeholder="Paste your MCQ questions here..."
          value={mcqText}
          onChange={(e) => setMcqText(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />

        <div className="flex gap-3">
          <Button 
            onClick={handleCreateQuiz}
            disabled={isGenerating || !mcqText.trim()}
            className="flex-1"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                Creating Quiz...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Create Quiz
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
