import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { QuizConfigForm } from "@/components/QuizConfig";
import { ManualQuizInput } from "@/components/ManualQuizInput";
import { TelegramShare } from "@/components/TelegramShare";
import { QuizOverview } from "@/components/QuizOverview";
import { QuizConfig as QuizConfigType } from "@/types/quiz";
import { useQuizGeneration } from "@/hooks/useQuizGeneration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Database from "lucide-react/dist/esm/icons/database";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Filter from "lucide-react/dist/esm/icons/filter";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Upload from "lucide-react/dist/esm/icons/upload";
import { LoadingState } from "@/components/LoadingState";
import { DocumentService, Document } from "@/services/documentService";
import { QuestionBankService, QuestionBankItem, QuestionBankFilters } from "@/services/questionBankService";
import { SubscriptionService } from "@/services/subscriptionService";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateQuizPage() {
  const { quiz, isGenerating, generateQuiz, resetQuiz, setQuiz } = useQuizGeneration();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [isDocumentsRefreshing, setIsDocumentsRefreshing] = useState(false);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [storageUsed, setStorageUsed] = useState({ current: 0, limit: 50 });

  // Question Bank state
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [isQuestionsRefreshing, setIsQuestionsRefreshing] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  const [filters, setFilters] = useState<QuestionBankFilters>({});
  const [stats, setStats] = useState<any>(null);

  // Data loading functions
  const loadChannels = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error loading channels:", authError);
        return;
      }
      if (!user) {
        console.error("No user found when loading channels");
        return;
      }

      const userChannels = await ChannelService.getUserChannels(user.id);
      setChannels(userChannels);
    } catch (error) {
      console.error("Failed to load channels:", error);
      // Don't show toast for channels as it's not critical
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error loading documents:", authError);
        toast({
          title: "Authentication Error",
          description: "Please try logging in again",
          variant: "destructive",
        });
        return;
      }
      if (!user) {
        console.error("No user found when loading documents");
        return;
      }

      const docs = await DocumentService.getUserDocuments(user.id, selectedChannel || undefined);
      setDocuments(docs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load documents";
      console.error("Failed to load documents:", error);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDocumentsLoading(false);
    }
  }, [selectedChannel, toast]);

  const loadStorageInfo = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error loading storage:", authError);
        return;
      }
      if (!user) {
        console.error("No user found when loading storage info");
        return;
      }

      const canUpload = await SubscriptionService.canUserPerformAction(user.id, "upload_pdf");
      if (canUpload.limit && canUpload.current !== undefined) {
        setStorageUsed({ current: canUpload.current, limit: canUpload.limit });
      }
    } catch (error) {
      console.error("Failed to load storage info:", error);
      // Don't show toast for storage info as it's not critical
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error loading questions:", authError);
        toast({
          title: "Authentication Error",
          description: "Please try logging in again",
          variant: "destructive",
        });
        return;
      }
      if (!user) {
        console.error("No user found when loading questions");
        return;
      }

      const data = await QuestionBankService.getQuestions(user.id, filters, 100);
      setQuestions(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load questions";
      console.error("Failed to load questions:", error);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setQuestionsLoading(false);
    }
  }, [filters, toast]);

  const loadStats = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error loading stats:", authError);
        return;
      }
      if (!user) {
        console.error("No user found when loading stats");
        return;
      }

      const statistics = await QuestionBankService.getStatistics(user.id);
      setStats(statistics);
    } catch (error) {
      console.error("Failed to load stats:", error);
      // Don't show toast for stats as it's not critical
    }
  }, []);

  // Effects for loading data
  useEffect(() => {
    const channelFromUrl = searchParams.get("channel");
    if (channelFromUrl) {
      setSelectedChannel(channelFromUrl);
    }

    // Load all data once on mount
    const initializeData = async () => {
      await Promise.all([
        loadChannels(),
        loadStorageInfo(),
        loadQuestions(),
        loadStats()
      ]);
      // Load documents after we have the channel selection
      await loadDocuments();
    };

    initializeData();
  }, []); // Empty dependency array - run once on mount

  // Reload documents when selectedChannel changes
  useEffect(() => {
    if (selectedChannel) {
      loadDocuments();
    }
  }, [selectedChannel]);

  // Reload questions when filters change
  useEffect(() => {
    loadQuestions();
    loadStats();
  }, [filters]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Only PDF files are supported",
        variant: "destructive",
      });
      return;
    }

    if (!selectedChannel) {
      toast({
        title: "Channel Required",
        description: "Please select a channel before uploading",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await DocumentService.uploadDocument(user.id, file, {
        title: file.name,
        language: "bn",
        channelId: selectedChannel,
      });

      toast({
        title: "Upload Successful",
        description: "Your document is being processed and added to the channel's knowledge base",
      });

      loadDocuments();
      loadStorageInfo();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await DocumentService.deleteDocument(documentId, user.id);

      toast({
        title: "Deleted",
        description: "Document deleted successfully",
      });

      loadDocuments();
      loadStorageInfo();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleDocumentsRefresh = async () => {
    setIsDocumentsRefreshing(true);
    await loadDocuments();
    await loadStorageInfo();
    setIsDocumentsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Documents list updated",
    });
  };

  const handleFilterChange = useCallback((key: string, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  }, []);

  const handleQuestionsRefresh = async () => {
    setIsQuestionsRefreshing(true);
    await loadQuestions();
    await loadStats();
    setIsQuestionsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Question bank updated",
    });
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await QuestionBankService.deleteQuestion(questionId, user.id);
      setQuestions(questions.filter(q => q.id !== questionId));
      toast({
        title: "Deleted",
        description: "Question deleted successfully",
      });
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Quiz functions
  const handleStartQuiz = useCallback(async (config: QuizConfigType) => {
    await generateQuiz(config);
  }, [generateQuiz]);

  const handleQuizCreated = useCallback((createdQuiz: Parameters<typeof setQuiz>[0]) => {
    setQuiz(createdQuiz);
  }, [setQuiz]);

  // Memoized filtered data
  const filteredDocuments = useMemo(() => documents.filter(doc =>
    documentSearchQuery === "" ||
    (doc.title || doc.file_name).toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
    doc.ai_summary?.toLowerCase().includes(documentSearchQuery.toLowerCase())
  ), [documents, documentSearchQuery]);

  const filteredQuestions = useMemo(() => questions.filter(q =>
    questionSearchQuery === "" ||
    q.question.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
    q.topic.toLowerCase().includes(questionSearchQuery.toLowerCase()) ||
    q.options.some(opt => opt.toLowerCase().includes(questionSearchQuery.toLowerCase()))
  ), [questions, questionSearchQuery]);

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
      <div className="max-w-6xl mx-auto">
        {!quiz ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Create Quiz</h1>
                <p className="text-muted-foreground">Generate AI-powered quizzes, manage documents and question bank</p>
              </div>
            </div>

            <Tabs defaultValue="ai" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Generated
                </TabsTrigger>
                <TabsTrigger value="manual">Manual Input</TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="question-bank" className="gap-2">
                  <Database className="h-4 w-4" />
                  Question Bank
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="animate-in fade-in duration-300">
                <QuizConfigForm onStartQuiz={handleStartQuiz} isGenerating={isGenerating} />
              </TabsContent>

              <TabsContent value="manual" className="animate-in fade-in duration-300">
                <ManualQuizInput onQuizCreated={handleQuizCreated} isGenerating={false} />
              </TabsContent>

              <TabsContent value="documents" className="animate-in fade-in duration-300">
                <div className="space-y-6">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        Document Library
                      </h2>
                      <p className="text-muted-foreground">
                        Upload PDFs to your channel's knowledge base
                        {documentSearchQuery && ` (${filteredDocuments.length} matching)`}
                      </p>
                    </div>
                    <div className="flex gap-3 items-end flex-wrap">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search documents..."
                          value={documentSearchQuery}
                          onChange={(e) => setDocumentSearchQuery(e.target.value)}
                          className="pl-10 w-48"
                        />
                      </div>
                      <div className="w-48">
                        <Label htmlFor="channel-select" className="text-sm mb-2 block">
                          Channel
                        </Label>
                        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                          <SelectTrigger id="channel-select">
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Channels</SelectItem>
                            {channels.map((channel) => (
                              <SelectItem key={channel.id} value={channel.id}>
                                {channel.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="outline" onClick={handleDocumentsRefresh} disabled={isDocumentsRefreshing} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${isDocumentsRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                      <div>
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={handleUpload}
                          disabled={uploading || !selectedChannel || selectedChannel === "all"}
                          className="hidden"
                          id="pdf-upload"
                        />
                        <Button asChild disabled={uploading || !selectedChannel || selectedChannel === "all"} className="gap-2">
                          <label htmlFor="pdf-upload" className="cursor-pointer">
                            <Upload className="w-4 h-4" />
                            {uploading ? "Uploading..." : "Upload PDF"}
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Storage Usage</CardTitle>
                      <CardDescription>
                        {storageUsed.current.toFixed(2)} GB / {storageUsed.limit} GB used
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-muted rounded-full h-4">
                        <div
                          className="bg-primary h-4 rounded-full transition-all"
                          style={{ width: `${(storageUsed.current / storageUsed.limit) * 100}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {documentsLoading ? (
                    <div className="grid gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex gap-3">
                                <Skeleton className="w-10 h-10 rounded" />
                                <div>
                                  <Skeleton className="h-6 w-48 mb-2" />
                                  <Skeleton className="h-4 w-32" />
                                </div>
                              </div>
                              <Skeleton className="h-8 w-24" />
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : filteredDocuments.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          {documentSearchQuery ? "No matching documents" : "No documents yet"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {documentSearchQuery
                            ? "Try adjusting your search query"
                            : "Upload your first PDF to generate AI-powered quizzes"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {filteredDocuments.map((doc) => (
                        <Card key={doc.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex gap-3">
                                <FileText className="w-10 h-10 text-primary" />
                                <div>
                                  <CardTitle className="text-lg">{doc.title || doc.file_name}</CardTitle>
                                  <CardDescription>
                                    {formatFileSize(doc.file_size_bytes)} • {doc.page_count || "?"} pages •{" "}
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Sparkles className="w-4 h-4" />
                                  Generate Quiz
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {doc.processing_status !== "completed" && (
                            <CardContent>
                              <div className="text-sm text-muted-foreground">
                                Status: {doc.processing_status}
                                {doc.processing_error && ` - ${doc.processing_error}`}
                              </div>
                            </CardContent>
                          )}
                          {doc.ai_summary && (
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{doc.ai_summary}</p>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="question-bank" className="animate-in fade-in duration-300">
                <div className="space-y-6">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Database className="w-6 h-6" />
                        Question Bank
                      </h2>
                      <p className="text-muted-foreground">
                        {stats?.total || 0} questions available
                        {questionSearchQuery && ` (${filteredQuestions.length} matching)`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search questions..."
                          value={questionSearchQuery}
                          onChange={(e) => setQuestionSearchQuery(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Button variant="outline" onClick={handleQuestionsRefresh} disabled={isQuestionsRefreshing} className="gap-2">
                        <RefreshCw className={`w-4 h-4 ${isQuestionsRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {/* Filters */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filters
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Difficulty</label>
                          <Select
                            value={filters.difficulty || "all"}
                            onValueChange={(value) => handleFilterChange("difficulty", value === "all" ? null : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Difficulties" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Difficulties</SelectItem>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Language</label>
                          <Select
                            value={filters.language || "all"}
                            onValueChange={(value) => handleFilterChange("language", value === "all" ? null : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Languages" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Languages</SelectItem>
                              <SelectItem value="bn">Bengali</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="hi">Hindi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Topic</label>
                          <Input
                            placeholder="Filter by topic"
                            value={filters.topic || ""}
                            onChange={(e) => handleFilterChange("topic", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Subject</label>
                          <Input
                            placeholder="Filter by subject"
                            value={filters.subject || ""}
                            onChange={(e) => handleFilterChange("subject", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Statistics */}
                  {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total Questions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{stats.total}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Topics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{Object.keys(stats.byTopic).length}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Languages</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">{Object.keys(stats.byLanguage).length}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Average Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {stats.total > 0
                              ? Math.round(
                                  questions.reduce((sum, q) => sum + q.times_used, 0) / stats.total
                                )
                              : 0}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Questions List */}
                  {questionsLoading ? (
                    <div className="grid gap-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                          <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Array.from({ length: 4 }).map((_, j) => (
                                <Skeleton key={j} className="h-10 w-full" />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredQuestions.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                          {questionSearchQuery ? "No matching questions" : "No questions found"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {questionSearchQuery
                            ? "Try adjusting your search or filters"
                            : "Add questions manually or import from quizzes and documents"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {filteredQuestions.map((q) => (
                        <Card key={q.id}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{q.question}</CardTitle>
                                <CardDescription>
                                  {q.topic} • {q.difficulty} • {q.language} • Used {q.times_used} times
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                {q.is_public && (
                                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                                    Public
                                  </span>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {q.options.map((option, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2 rounded border ${
                                    idx === q.correct_option_index
                                      ? "bg-green-50 border-green-300 dark:bg-green-950/20"
                                      : ""
                                  }`}
                                >
                                  {idx === q.correct_option_index && "✓ "}
                                  {option}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <p className="mt-3 text-sm text-muted-foreground italic">
                                Explanation: {q.explanation}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
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
