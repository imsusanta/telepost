import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TestService, TestWithQuestions, QuestionBank } from "@/services/testService";
import { 
  ArrowLeft,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  Send,
  CheckCircle,
  XCircle,
  BarChart3,
  Users,
  Clock,
  Target,
  Percent,
  Import
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TestEditor() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionBank[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [sendingToTelegram, setSendingToTelegram] = useState(false);
  
  const [newQuestion, setNewQuestion] = useState({
    custom_question: "",
    custom_options: ["", "", "", ""],
    custom_correct_index: 0,
    custom_explanation: "",
    marks: 1,
  });

  const [analytics, setAnalytics] = useState<{
    totalAttempts: number;
    avgScore: number;
    avgPercentage: number;
    passRate: number;
    topScore: number;
    avgTimeMinutes: number;
  } | null>(null);

  useEffect(() => {
    if (testId) {
      loadTest();
      loadAnalytics();
    }
  }, [testId]);

  const loadTest = async () => {
    try {
      const data = await TestService.getTestById(testId!);
      setTest(data);
    } catch (error) {
      console.error("Error loading test:", error);
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await TestService.getTestAnalytics(testId!);
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const loadAvailableQuestions = async () => {
    try {
      const questions = await TestService.getAvailableQuestions();
      // Filter out questions already in the test
      const existingIds = test?.questions.map(q => q.question_bank_id).filter(Boolean) || [];
      setAvailableQuestions(questions.filter(q => !existingIds.includes(q.id)));
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const handleImportQuestions = async () => {
    if (selectedQuestions.length === 0) return;

    try {
      await TestService.addQuestionsToTest(testId!, selectedQuestions);
      toast({
        title: "Success",
        description: `${selectedQuestions.length} questions imported`,
      });
      setIsImportDialogOpen(false);
      setSelectedQuestions([]);
      loadTest();
    } catch (error) {
      console.error("Error importing questions:", error);
      toast({
        title: "Error",
        description: "Failed to import questions",
        variant: "destructive",
      });
    }
  };

  const handleAddCustomQuestion = async () => {
    if (!newQuestion.custom_question || newQuestion.custom_options.some(o => !o.trim())) {
      toast({
        title: "Error",
        description: "Please fill all question fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await TestService.addCustomQuestion(testId!, {
        ...newQuestion,
        custom_options: newQuestion.custom_options,
      });
      toast({
        title: "Success",
        description: "Question added successfully",
      });
      setIsAddQuestionDialogOpen(false);
      setNewQuestion({
        custom_question: "",
        custom_options: ["", "", "", ""],
        custom_correct_index: 0,
        custom_explanation: "",
        marks: 1,
      });
      loadTest();
    } catch (error) {
      console.error("Error adding question:", error);
      toast({
        title: "Error",
        description: "Failed to add question",
        variant: "destructive",
      });
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    try {
      await TestService.removeQuestion(questionId);
      toast({
        title: "Success",
        description: "Question removed",
      });
      loadTest();
    } catch (error) {
      console.error("Error removing question:", error);
      toast({
        title: "Error",
        description: "Failed to remove question",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    if (!test?.questions || test.questions.length === 0) {
      toast({
        title: "Error",
        description: "Add at least one question before publishing",
        variant: "destructive",
      });
      return;
    }

    try {
      await TestService.publishTest(testId!);
      toast({
        title: "Success",
        description: "Test published successfully",
      });
      loadTest();
    } catch (error) {
      console.error("Error publishing test:", error);
      toast({
        title: "Error",
        description: "Failed to publish test",
        variant: "destructive",
      });
    }
  };

  const handleSendToTelegram = async () => {
    if (!telegramChatId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Telegram Chat ID",
        variant: "destructive",
      });
      return;
    }

    setSendingToTelegram(true);
    try {
      await TestService.sendTestToTelegram(testId!, telegramChatId);
      toast({
        title: "Success",
        description: "Test sent to Telegram successfully",
      });
      setIsTelegramDialogOpen(false);
      setTelegramChatId("");
    } catch (error) {
      console.error("Error sending to Telegram:", error);
      toast({
        title: "Error",
        description: "Failed to send test to Telegram",
        variant: "destructive",
      });
    } finally {
      setSendingToTelegram(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!test) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Test not found</h2>
          <Button onClick={() => navigate("/dashboard/tests")} className="mt-4">
            Back to Tests
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/tests")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{test.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={test.is_published ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}>
                  {test.is_published ? "Published" : "Draft"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {test.questions?.length || 0} questions
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsTelegramDialogOpen(true);
              }}
              disabled={!test.questions || test.questions.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Send to Telegram
            </Button>
            {!test.is_published && (
              <Button onClick={handlePublish} className="bg-gradient-to-r from-indigo-500 to-purple-500">
                <Eye className="w-4 h-4 mr-2" />
                Publish Test
              </Button>
            )}
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && analytics.totalAttempts > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Attempts</span>
                </div>
                <p className="text-2xl font-bold">{analytics.totalAttempts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-xs">Avg Score</span>
                </div>
                <p className="text-2xl font-bold">{analytics.avgScore}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Percent className="w-4 h-4" />
                  <span className="text-xs">Avg %</span>
                </div>
                <p className="text-2xl font-bold">{analytics.avgPercentage}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs">Pass Rate</span>
                </div>
                <p className="text-2xl font-bold">{analytics.passRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs">Top Score</span>
                </div>
                <p className="text-2xl font-bold">{analytics.topScore}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Avg Time</span>
                </div>
                <p className="text-2xl font-bold">{analytics.avgTimeMinutes}m</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Questions Section */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="questions">Questions ({test.questions?.length || 0})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  loadAvailableQuestions();
                  setIsImportDialogOpen(true);
                }}
              >
                <Import className="w-4 h-4 mr-2" />
                Import from Question Bank
              </Button>
              <Button onClick={() => setIsAddQuestionDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Question
              </Button>
            </div>

            {/* Questions List */}
            {test.questions && test.questions.length > 0 ? (
              <div className="space-y-4">
                {test.questions.map((question, index) => {
                  const questionText = question.question_bank_id
                    ? question.question_bank?.question
                    : question.custom_question;
                  const options = (question.question_bank_id
                    ? question.question_bank?.options
                    : question.custom_options) as string[] | undefined;
                  const correctIndex = question.question_bank_id
                    ? question.question_bank?.correct_option_index
                    : question.custom_correct_index;

                  return (
                    <Card key={question.id} className="group">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GripVertical className="w-4 h-4 cursor-grab" />
                            <span className="font-bold text-lg">{index + 1}.</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{questionText}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {question.marks || 1} mark{(question.marks || 1) > 1 ? "s" : ""}
                              </Badge>
                              {question.question_bank_id && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500">
                                  From Question Bank
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => handleRemoveQuestion(question.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 ml-8">
                          {options?.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                                optIndex === correctIndex
                                  ? "bg-emerald-500/10 border border-emerald-500/20"
                                  : "bg-muted"
                              }`}
                            >
                              {optIndex === correctIndex ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <span>{option}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No questions added yet</p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      loadAvailableQuestions();
                      setIsImportDialogOpen(true);
                    }}
                  >
                    <Import className="w-4 h-4 mr-2" />
                    Import from Question Bank
                  </Button>
                  <Button onClick={() => setIsAddQuestionDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Question
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Test Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Duration</Label>
                    <p className="font-medium">{test.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Total Marks</Label>
                    <p className="font-medium">{test.total_marks}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Passing %</Label>
                    <p className="font-medium">{test.passing_marks}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Max Attempts</Label>
                    <p className="font-medium">{test.max_attempts}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Negative Marking</Label>
                    <p className="font-medium">{test.negative_marking ? `Yes (-${test.negative_marks_per_question})` : "No"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Shuffle Questions</Label>
                    <p className="font-medium">{test.shuffle_questions ? "Yes" : "No"}</p>
                  </div>
                </div>
                {test.instructions && (
                  <div>
                    <Label className="text-muted-foreground">Instructions</Label>
                    <p className="mt-1 whitespace-pre-wrap">{test.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Import from Question Bank Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Import from Question Bank</DialogTitle>
              <DialogDescription>
                Select questions to add to this test
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 p-1">
                {availableQuestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No available questions in your question bank
                  </p>
                ) : (
                  availableQuestions.map((question) => (
                    <div
                      key={question.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedQuestions.includes(question.id)
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        setSelectedQuestions((prev) =>
                          prev.includes(question.id)
                            ? prev.filter((id) => id !== question.id)
                            : [...prev, question.id]
                        );
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedQuestions.includes(question.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium line-clamp-2">{question.question}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                            <Badge variant="outline" className="text-xs">{question.difficulty}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImportQuestions}
                disabled={selectedQuestions.length === 0}
              >
                Import {selectedQuestions.length} Question{selectedQuestions.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Custom Question Dialog */}
        <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Custom Question</DialogTitle>
              <DialogDescription>
                Create a new MCQ question
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  placeholder="Enter your question..."
                  value={newQuestion.custom_question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, custom_question: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Options *</Label>
                {newQuestion.custom_options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={newQuestion.custom_correct_index === index}
                      onChange={() => setNewQuestion({ ...newQuestion, custom_correct_index: index })}
                      className="w-4 h-4"
                    />
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.custom_options];
                        newOptions[index] = e.target.value;
                        setNewQuestion({ ...newQuestion, custom_options: newOptions });
                      }}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Select the radio button for the correct answer</p>
              </div>
              <div className="space-y-2">
                <Label>Explanation (Optional)</Label>
                <Textarea
                  placeholder="Explain the correct answer..."
                  value={newQuestion.custom_explanation}
                  onChange={(e) => setNewQuestion({ ...newQuestion, custom_explanation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Marks</Label>
                <Input
                  type="number"
                  min={1}
                  value={newQuestion.marks}
                  onChange={(e) => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddQuestionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomQuestion}>
                Add Question
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send to Telegram Dialog */}
        <Dialog open={isTelegramDialogOpen} onOpenChange={setIsTelegramDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test to Telegram</DialogTitle>
              <DialogDescription>
                Send all questions as quizzes to a Telegram channel
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Telegram Chat ID *</Label>
                <Input
                  placeholder="e.g., -1001234567890"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the channel or group ID where you want to send the test
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTelegramDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendToTelegram} disabled={sendingToTelegram}>
                {sendingToTelegram ? "Sending..." : "Send to Telegram"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
