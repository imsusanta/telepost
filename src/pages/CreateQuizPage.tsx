import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { QuizConfigForm } from "@/components/QuizConfig";
import { ManualQuizInput } from "@/components/ManualQuizInput";
import { TelegramShare } from "@/components/TelegramShare";
import { QuizOverview } from "@/components/QuizOverview";
import { ChannelManager } from "@/components/ChannelManager";
import { DocumentsSection } from "@/components/DocumentsSection";
import { QuestionBankSection } from "@/components/QuestionBankSection";
import { QuizConfig as QuizConfigType } from "@/types/quiz";
import { useQuizGeneration } from "@/hooks/useQuizGeneration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Hash, FileText, Database } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function CreateQuizPage() {
  const { quiz, isGenerating, generateQuiz, resetQuiz, setQuiz } = useQuizGeneration();
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const handleStartQuiz = async (config: QuizConfigType) => {
    await generateQuiz(config);
  };

  const handleQuizCreated = (createdQuiz: any) => {
    setQuiz(createdQuiz);
  };

  const handleQuestionToggle = (questionId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  if (isGenerating) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <LoadingState message="Generating your quiz with AI..." size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {!quiz ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Create Quiz</h1>
                <p className="text-muted-foreground">
                  Manage channels, knowledge base, and create powerful quizzes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Sidebar: Channels & Knowledge Base */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-4">
                  <Accordion type="multiple" defaultValue={["channels", "documents", "questions"]}>
                    {/* Channels Section */}
                    <AccordionItem value="channels">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-primary" />
                          <span className="font-semibold">Channels</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <ChannelManager
                          selectedChannelId={selectedChannelId}
                          onChannelSelect={setSelectedChannelId}
                          compact
                        />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Documents Section */}
                    <AccordionItem value="documents">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-semibold">Documents</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <DocumentsSection
                          channelId={selectedChannelId}
                          selectedDocumentId={selectedDocumentId}
                          onDocumentSelect={setSelectedDocumentId}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    {/* Question Bank Section */}
                    <AccordionItem value="questions">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-primary" />
                          <span className="font-semibold">Question Bank</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <QuestionBankSection
                          channelId={selectedChannelId}
                          selectedQuestionIds={selectedQuestionIds}
                          onQuestionToggle={handleQuestionToggle}
                          multiSelect
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>

                {/* Quick Info */}
                {selectedChannelId && (
                  <Card className="p-3 bg-primary/5 border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      <strong>Tip:</strong> Quizzes will be sent to the selected channel. Documents
                      and questions are organized by channel for better management.
                    </p>
                  </Card>
                )}
              </div>

              {/* Right Content: Quiz Creation */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="ai" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="ai" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Generated
                    </TabsTrigger>
                    <TabsTrigger value="manual">Manual Input</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ai" className="animate-in fade-in duration-300">
                    <QuizConfigForm
                      onStartQuiz={handleStartQuiz}
                      isGenerating={isGenerating}
                    />
                  </TabsContent>

                  <TabsContent value="manual" className="animate-in fade-in duration-300">
                    <ManualQuizInput
                      onQuizCreated={handleQuizCreated}
                      isGenerating={false}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={resetQuiz} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Create New Quiz
              </Button>
              <TelegramShare quiz={quiz} selectedChannelId={selectedChannelId} />
            </div>
            <QuizOverview quiz={quiz} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
