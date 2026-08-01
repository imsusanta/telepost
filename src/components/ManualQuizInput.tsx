import { useState, useEffect } from 'react';
import { AlertCircle, FileText, Send } from "lucide-react";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Quiz, QuizQuestion } from '@/types/quiz';
import { useToast } from '@/hooks/use-toast';

interface ManualQuizInputProps {
  onQuizCreated: (quiz: Quiz) => void;
  isGenerating: boolean;
}

export function ManualQuizInput({ onQuizCreated, isGenerating }: ManualQuizInputProps) {
  const [mcqText, setMcqText] = useState('');
  const [parsingWarnings, setParsingWarnings] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (mcqText.trim()) {
      parseMCQ(mcqText);
    } else {
      setParsingWarnings([]);
    }
  }, [mcqText]);

  const parseMCQ = (text: string): QuizQuestion[] => {
    const questions: QuizQuestion[] = [];

    // Normalize line endings
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    // Split the text into sections starting with "1.", "2.", etc.
    const sections = normalizedText.split(/\n?(?=\d+\.)/);

    let questionNumber = 1;

    for (const section of sections) {
      if (!section.trim()) continue;

      try {
        // Check which format is being used: (A)/(B)/(C)/(D) or a)/b)/c)/d)
        const usesParenthesis = /\([A-Da-d]\)/.test(section);

        let questionText = "";
        let options: string[] = [];
        let correctIndex = 0;

        if (usesParenthesis) {
          // Format: (A), (B), (C), (D)
          const qMatch = section.match(/^\d+\.(.*?)(?=\n\s*\([Aa]\))/s);
          questionText = qMatch ? qMatch[1].trim() : "";

          // Extract options
          const optAMatch = section.match(/\([Aa]\)\s*(.*?)(?=\n\s*\([Bb]\))/s);
          const optBMatch = section.match(/\([Bb]\)\s*(.*?)(?=\n\s*\([Cc]\))/s);
          const optCMatch = section.match(/\([Cc]\)\s*(.*?)(?=\n\s*\([Dd]\))/s);
          const optDMatch = section.match(/\([Dd]\)\s*(.*?)(?=\n\s*Ans:)/si) ||
            section.match(/\([Dd]\)\s*(.*?)$/s);

          options = [
            optAMatch ? optAMatch[1].trim() : "",
            optBMatch ? optBMatch[1].trim() : "",
            optCMatch ? optCMatch[1].trim() : "",
            optDMatch ? optDMatch[1].split(/\n\s*Ans:/i)[0].trim() : ""
          ];

          // Extract answer - supports both "Ans: (B)" and "Ans: B" formats
          const ansMatch = section.match(/Ans:\s*\(?([A-Da-d])\)?/i);
          const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : "";

          const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
          correctIndex = letterToIndex[ansLetter] ?? 0;
        } else {
          // Format: a), b), c), d) or a., b., c., d. with * marking correct
          const qMatch = section.match(/^\d+\.(.*?)(?=\n\s*[aA][\)\.])/s);
          questionText = qMatch ? qMatch[1].trim() : "";

          // Check for Ans: format first
          const hasAnsLine = /Ans:/i.test(section);

          if (hasAnsLine) {
            // Format with Ans: line
            const optAMatch = section.match(/[aA][\)\.]\s*(.*?)(?=\n\s*[bB][\)\.])/s);
            const optBMatch = section.match(/[bB][\)\.]\s*(.*?)(?=\n\s*[cC][\)\.])/s);
            const optCMatch = section.match(/[cC][\)\.]\s*(.*?)(?=\n\s*[dD][\)\.])/s);
            const optDMatch = section.match(/[dD][\)\.]\s*(.*?)(?=\n\s*Ans:)/si) ||
              section.match(/[dD][\)\.]\s*(.*?)$/s);

            options = [
              optAMatch ? optAMatch[1].trim() : "",
              optBMatch ? optBMatch[1].trim() : "",
              optCMatch ? optCMatch[1].trim() : "",
              optDMatch ? optDMatch[1].split(/\n\s*Ans:/i)[0].trim() : ""
            ];

            const ansMatch = section.match(/Ans:\s*\(?([a-dA-D])\)?/i);
            const ansLetter = ansMatch ? ansMatch[1].toLowerCase() : "";

            const letterToIndex: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
            correctIndex = letterToIndex[ansLetter] ?? 0;
          } else {
            // Old format with * or ✓ marking correct
            const lines = section.split('\n').filter(line => line.trim());

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();

              if (/^\d+\./.test(line)) {
                questionText = line.replace(/^\d+\.\s*/, '').trim();
              } else if (/^[a-dA-D][\)\.]\s*/i.test(line)) {
                const optionText = line.replace(/^[a-dA-D][\)\.]\s*/i, '').trim();
                const isCorrect = /\*|✓|\(correct\)/i.test(optionText);
                const cleanOption = optionText.replace(/\*|✓|\(correct\)/gi, '').trim();

                if (isCorrect) {
                  correctIndex = options.length;
                }
                options.push(cleanOption);
              }
            }
          }
        }

        // Filter out empty options and validate
        options = options.filter(opt => opt !== "");

        if (questionText && options.length >= 2) {
          questions.push({
            id: questionNumber++,
            question: questionText,
            options,
            correct_option_index: correctIndex
          });
        }
      } catch (error) {
        console.error("Error parsing section:", section, error);
      }
    }

    const warnings: string[] = [];
    questions.forEach((q, i) => {
      const qNum = i + 1;
      if (q.question.length > 300) warnings.push(`Q${qNum}: Question text > 300 chars`);
      q.options?.forEach((opt, oi) => {
        if (opt.length > 100) warnings.push(`Q${qNum}: Option ${String.fromCharCode(65 + oi)} > 100 chars`);
      });
      if (q.explanation && q.explanation.length > 200) warnings.push(`Q${qNum}: Explanation > 200 chars`);
    });
    setParsingWarnings(warnings);

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
    <Card className="p-6 bg-white dark:bg-slate-900 border shadow-sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manual MCQ Input</h2>
            <p className="text-sm text-gray-500">Paste your questions in any format below</p>
          </div>
        </div>

        {/* Format Examples */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Format 1: (A), (B), (C), (D)</h4>
            <div className="text-sm font-mono text-gray-700 dark:text-gray-300 space-y-0.5">
              <div>1. পশ্চিমবঙ্গের সর্বোচ্চ শৃঙ্গ কোনটি?</div>
              <div>(A) ফালুট</div>
              <div>(B) সান্দাকফু</div>
              <div>(C) অযোধ্যা</div>
              <div>(D) গোর্গাবুরু</div>
              <div className="text-sky-600 dark:text-sky-400">Ans: (B) সান্দাকফু</div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Format 2: a), b), c), d)</h4>
            <div className="text-sm font-mono text-gray-700 dark:text-gray-300 space-y-0.5">
              <div>1. What is the capital of France?</div>
              <div>a) London</div>
              <div>b) Paris *</div>
              <div>c) Berlin</div>
              <div>d) Madrid</div>
              <div className="text-gray-400 text-xs mt-1">Use * to mark correct answer</div>
            </div>
          </div>
        </div>

        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <p>• Supports both <strong>(A), (B), (C), (D)</strong> and <strong>a), b), c), d)</strong> formats</p>
              <p>• Use <strong>Ans: (B)</strong> or <strong>*</strong> to mark the correct answer</p>
              <p>• Each question needs at least 2 options</p>
            </div>
          </div>
        </div>

        <Textarea
          placeholder="Paste your MCQ questions here..."
          value={mcqText}
          onChange={(e) => setMcqText(e.target.value)}
          className="min-h-[250px] font-mono text-sm bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-gray-700 focus:border-sky-500 rounded-xl"
        />

        {parsingWarnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Telegram Poll Limits Exceeded</p>
                <div className="max-h-20 overflow-y-auto space-y-0.5">
                  {parsingWarnings.map((warn, i) => (
                    <p key={i} className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">• {warn}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleCreateQuiz}
            disabled={isGenerating || !mcqText.trim()}
            className="flex-1 h-12 font-semibold bg-sky-500 hover:bg-sky-600 text-white"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
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
