import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Database, FileText, Globe, RefreshCw, Search, Sparkles, Trash2, Upload, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { QuizConfigForm } from "@/components/QuizConfig";
import { ManualQuizInput } from "@/components/ManualQuizInput";
import { TelegramShare } from "@/components/TelegramShare";
import { QuizOverview } from "@/components/QuizOverview";
import { QuizConfig as QuizConfigType, QuizQuestion } from "@/types/quiz";
import { useQuizGeneration } from "@/hooks/useQuizGeneration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ClassificationBadges } from "@/components/ClassificationBadges";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/LoadingState";
import { DocumentService, Document } from "@/services/documentService";
import { QuestionBankService, QuestionBankItem, QuestionBankFilters } from "@/services/questionBankService";
import { isSuperAdmin as checkSuperAdminStatus } from "@/services/couponService";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { QuestionFilters } from "@/components/QuestionFilters";
import { ClassificationService } from "@/services/classificationService";
import { ClassificationMetadataService } from "@/services/classificationMetadataService";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";

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
  const [filters, setFilters] = useState<QuestionBankFilters>({ includePublic: true });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    byTopic: Record<string, number>;
    bySubject: Record<string, number>;
    byLanguage: Record<string, number>;
    unclassifiedCount: number;
    publicCount: number;
    privateCount: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("ai");

  // Subscription hook
  const { 
    canAccess, 
    getLimit,
    loading: isLoadingSubscription,
    isSuperAdmin: superAdminRole,
  } = useSubscription();

  const hasAiQuiz = canAccess('create_quiz', 'ai_generated');
  const hasManualInput = canAccess('create_quiz', 'manual_input');
  const hasQuestionBank = canAccess('create_quiz', 'question_bank');
  const hasDocuments = canAccess('create_quiz', 'documents');

  // Set default tab based on access
  useEffect(() => {
    if (!isLoadingSubscription) {
      if (!hasAiQuiz && activeTab === "ai") {
        if (hasManualInput) setActiveTab("manual");
        else if (hasQuestionBank) setActiveTab("question-bank");
      }
    }
  }, [hasAiQuiz, hasManualInput, hasQuestionBank, activeTab, isLoadingSubscription]);

  // Selection states
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [subjectsWithCounts, setSubjectsWithCounts] = useState<{ subject: string; count: number }[]>([]);
  const [topicsWithCounts, setTopicsWithCounts] = useState<{ topic: string; count: number }[]>([]);
  const [fullSubjects, setFullSubjects] = useState<any[]>([]);
  const [fullTopics, setFullTopics] = useState<any[]>([]);

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
      setCurrentUserId(user.id);

      const adminStatus = await checkSuperAdminStatus();
      setIsSuperAdmin(adminStatus);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase.rpc('get_user_storage_usage', { user_id: user.id });
      const storageLimitGB = getLimit('max_pdf_storage_gb') || 0.05; // Default 50MB if null
      
      setStorageUsed({
        current: data.total_bytes || 0,
        limit: storageLimitGB * 1024 * 1024 * 1024 // Convert GB to bytes
      });
    } catch (error) {
      console.error("Failed to load storage info:", error);
    }
  }, [getLimit]);

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

      const result = await QuestionBankService.getQuestions(user.id, filters, 100);
      setQuestions(result.data);
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

      const statistics = await QuestionBankService.getStatistics(user.id, true);
      setStats(statistics);
    } catch (error) {
      console.error("Failed to load stats:", error);
      // Don't show toast for stats as it's not critical
    }
  }, []);

  const loadClassificationData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [subjectsRes, topicsRes, allSubjectsRes, allTopicsRes] = await Promise.allSettled([
        ClassificationService.getSubjectsWithCounts(user.id),
        ClassificationService.getAllTopics(user.id),
        ClassificationMetadataService.getSubjects(),
        ClassificationMetadataService.getAllTopics()
      ]);

      const subjects = subjectsRes.status === 'fulfilled' ? subjectsRes.value : [];
      const topics = topicsRes.status === 'fulfilled' ? topicsRes.value : [];
      const allSubjects = allSubjectsRes.status === 'fulfilled' ? allSubjectsRes.value : [];
      const allTopics = allTopicsRes.status === 'fulfilled' ? allTopicsRes.value : [];

      setSubjectsWithCounts(subjects);
      setTopicsWithCounts(topics.map(t => ({ topic: t, count: 0 })));
      setFullSubjects(allSubjects);
      setFullTopics(allTopics);
    } catch (error) {
      console.error("Failed to load classification data:", error);
    }
  }, []);

  // Effects for loading data - consolidated to avoid duplicate calls
  useEffect(() => {
    const channelFromUrl = searchParams.get("channel");

    // Set the channel from URL first (if present)
    if (channelFromUrl) {
      setSelectedChannel(channelFromUrl);
    }

    // Load initial data in parallel on mount - optimized for faster startup
    // Note: loadDocuments and loadQuestions handle their own filtering based on state
    const initializeData = async () => {
      try {
        await Promise.all([
          loadChannels(),
          loadStorageInfo(),
          loadQuestions(),
          loadStats(),
          // Documents loaded with initial channel from URL (or empty)
          (async () => {
            if (channelFromUrl) {
              try {
                // Temporarily set the channel for document loading
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error) throw error;
                if (!user?.id) {
                  console.error('No user ID available for loading documents');
                  setDocumentsLoading(false);
                  return;
                }
                const docs = await DocumentService.getUserDocuments(
                  user.id,
                  channelFromUrl
                );
                setDocuments(docs);
                setDocumentsLoading(false);
              } catch (error) {
                console.error('Failed to load documents:', error);
                setDocumentsLoading(false);
              }
            } else {
              await loadDocuments();
            }
          })()
        ]);
      } catch (error) {
        console.error('Failed to initialize data:', error);
      }
    };

    initializeData();
  }, [loadChannels, loadStorageInfo, loadQuestions, loadStats, loadDocuments, searchParams]); // Run once on mount

  // Reload documents when selectedChannel changes (but not on initial mount)
  const [isInitialMount, setIsInitialMount] = useState(true);
  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      return;
    }
    loadDocuments();
  }, [selectedChannel, loadDocuments, isInitialMount]);

  // Reload questions when filters change (but not on initial mount)
  const [isFiltersInitialized, setIsFiltersInitialized] = useState(false);
  useEffect(() => {
    if (!isFiltersInitialized) {
      setIsFiltersInitialized(true);
      return;
    }
    loadQuestions();
    loadStats();
    loadClassificationData();
  }, [filters, loadQuestions, loadStats, loadClassificationData, isFiltersInitialized]);

  const handleToggleQuestion = (questionId: string) => {
    const newSelection = new Set(selectedQuestionIds);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestionIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedQuestionIds(new Set());
  };

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
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
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
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
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
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  // Quiz functions
  const handleStartQuiz = useCallback(async (config: QuizConfigType) => {
    if (config.channelId) {
      setSelectedChannel(config.channelId);
    }
    await generateQuiz(config);
  }, [generateQuiz]);

  const handleQuizCreated = useCallback((createdQuiz: Parameters<typeof setQuiz>[0]) => {
    setQuiz(createdQuiz);
  }, [setQuiz]);

  const handleAddToQuiz = useCallback((q: QuestionBankItem) => {
    const quizQuestion: QuizQuestion = {
      id: (quiz?.questions.length || 0) + 1,
      question: q.question,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation
    };

    if (quiz) {
      setQuiz({
        ...quiz,
        questions: [...quiz.questions, quizQuestion]
      });
    } else {
      setQuiz({
        request_id: `manual-${Date.now()}`,
        topic: q.topic || "Manual Selection",
        questions: [quizQuestion],
        metadata: {
          generated_at: new Date().toISOString()
        }
      });
    }

    toast({
      title: "Added to Quiz",
      description: "Question added to your current quiz.",
    });
  }, [quiz, setQuiz, toast]);

  const handleBulkAddToQuiz = useCallback(() => {
    if (selectedQuestionIds.size === 0) return;

    const selectedQuestions = questions.filter(q => selectedQuestionIds.has(q.id));

    const quizQuestions: QuizQuestion[] = selectedQuestions.map((q, idx) => ({
      id: (quiz?.questions.length || 0) + idx + 1,
      question: q.question,
      options: q.options,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation
    }));

    if (quiz) {
      setQuiz({
        ...quiz,
        questions: [...quiz.questions, ...quizQuestions]
      });
    } else {
      setQuiz({
        request_id: `manual-${Date.now()}`,
        topic: selectedQuestions[0]?.topic || "Manual Selection",
        questions: quizQuestions,
        metadata: {
          generated_at: new Date().toISOString()
        }
      });
    }

    setSelectedQuestionIds(new Set());
    toast({
      title: "Questions Added",
      description: `Added ${quizQuestions.length} questions to the quiz.`,
    });
  }, [quiz, questions, selectedQuestionIds, setQuiz, toast]);



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

  const handleSelectRange = useCallback(() => {
    const from = parseInt(rangeFrom) || 1;
    const to = parseInt(rangeTo) || (filteredQuestions?.length || 0);

    if (from > 0 && to >= from && to <= (filteredQuestions?.length || 0)) {
      const newSelection = new Set<string>();
      for (let i = from - 1; i < to && i < filteredQuestions.length; i++) {
        newSelection.add(filteredQuestions[i].id);
      }
      setSelectedQuestionIds(newSelection);
      toast({
        title: "Range Selected",
        description: `Selected questions ${from} to ${to}`,
      });
    } else {
      toast({
        title: "Invalid Range",
        description: `Please enter valid range (1 to ${filteredQuestions?.length || 0})`,
        variant: "destructive",
      });
    }
  }, [rangeFrom, rangeTo, filteredQuestions, toast]);

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
              <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold">Create Quiz</h1>
                <p className="text-sm md:text-base text-muted-foreground">Generate AI-powered quizzes, manage documents and question bank</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full mb-6 h-auto grid-cols-${[hasAiQuiz, hasManualInput, hasQuestionBank, hasDocuments].filter(Boolean).length || 1} md:grid-cols-${[hasAiQuiz, hasManualInput, hasQuestionBank, hasDocuments].filter(Boolean).length || 1}`}>
                {(hasAiQuiz || superAdminRole) && (
                  <TabsTrigger 
                    value="ai" 
                    className="gap-1 md:gap-2 text-xs md:text-sm py-2"
                  >
                    <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">AI</span> Generated
                  </TabsTrigger>
                )}
                {(hasManualInput || superAdminRole) && (
                  <TabsTrigger value="manual" className="text-xs md:text-sm py-2">Manual Input</TabsTrigger>
                )}
                {(hasQuestionBank || superAdminRole) && (
                  <TabsTrigger value="question-bank" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                    <Database className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Question</span> Bank
                  </TabsTrigger>
                )}
                {(hasDocuments || superAdminRole) && (
                  <TabsTrigger value="documents" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                    <FileText className="h-3 w-3 md:h-4 md:w-4" />
                    Documents
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="ai" className="animate-in fade-in duration-300">
                <QuizConfigForm
                  onStartQuiz={handleStartQuiz}
                  isGenerating={isGenerating}
                  maxQuestions={getLimit("max_questions_per_quiz") ?? undefined}
                />
              </TabsContent>

              {(hasManualInput || superAdminRole) && (
                <TabsContent value="manual" className="animate-in fade-in duration-300">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                          <Plus className="w-6 h-6" />
                          Manual Quiz Input
                        </h2>
                        <p className="text-muted-foreground">
                          Create quizzes manually by adding questions one by one
                        </p>
                      </div>
                      <div className="w-48">
                        <Label htmlFor="manual-channel-select" className="text-sm mb-2 block">
                          Target Channel
                        </Label>
                        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                          <SelectTrigger id="manual-channel-select">
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
                    </div>
                    <ManualQuizInput onQuizCreated={handleQuizCreated} isGenerating={false} />
                  </div>
                </TabsContent>
              )}

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
                        <Button asChild disabled={uploading || !selectedChannel || selectedChannel === "all" || !hasDocuments} className="gap-2">
                          <label htmlFor="pdf-upload" className={uploading || !selectedChannel || selectedChannel === "all" || !hasDocuments ? "cursor-not-allowed opacity-50" : "cursor-pointer"}>
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
                        {formatFileSize(storageUsed.current)} / {getLimit('max_pdf_storage_gb') || 0} GB used
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={async () => {
                                    if (doc.processing_status !== "completed") {
                                      toast({
                                        title: "Document Not Ready",
                                        description: "Please wait for document processing to complete",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    try {
                                      const { data: { user } } = await supabase.auth.getUser();
                                      if (!user) {
                                        toast({
                                          title: "Authentication Required",
                                          description: "Please log in to generate quizzes",
                                          variant: "destructive",
                                        });
                                        return;
                                      }

                                      // Generate quiz from document
                                      const config: QuizConfigType = {
                                        topic: doc.title || doc.file_name,
                                        questionCount: 5,
                                        language: (doc.language as "bn" | "en" | "hi") || "en",
                                        channelId: doc.channel_id || undefined,
                                        useChannelKnowledgeBase: false,
                                      };

                                      await generateQuiz(config);
                                    } catch (error) {
                                      console.error("Failed to generate quiz from document:", error);
                                    }
                                  }}
                                  disabled={doc.processing_status !== "completed" || isGenerating}
                                >
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
                  <QuestionFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    subjectsWithCounts={subjectsWithCounts}
                    topicsWithCounts={topicsWithCounts}
                    fullSubjects={fullSubjects}
                    fullTopics={fullTopics}
                    totalCount={stats?.total || 0}
                    filteredCount={filteredQuestions.length}
                  />

                  {/* Selection Bar */}
                  {filteredQuestions.length > 0 && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all"
                            checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                          <label htmlFor="select-all" className="text-xs md:text-sm font-medium cursor-pointer whitespace-nowrap">
                            Select All
                          </label>
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">Range:</span>
                          <Input
                            type="number"
                            placeholder="From"
                            value={rangeFrom}
                            onChange={(e) => setRangeFrom(e.target.value)}
                            className="w-14 md:w-16 h-7 md:h-8 text-xs md:text-sm"
                            min="1"
                          />
                          <span className="text-xs text-muted-foreground">-</span>
                          <Input
                            type="number"
                            placeholder="To"
                            value={rangeTo}
                            onChange={(e) => setRangeTo(e.target.value)}
                            className="w-14 md:w-16 h-7 md:h-8 text-xs md:text-sm"
                            min="1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectRange}
                            className="h-7 md:h-8 text-xs md:text-sm font-medium px-2 md:px-3"
                          >
                            Go
                          </Button>
                        </div>
                      </div>

                      {selectedQuestionIds.size > 0 && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-primary">
                            {selectedQuestionIds.size} selected
                          </span>
                          <div className="h-6 w-px bg-border mx-1" />
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleBulkAddToQuiz}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-lg shadow-primary/20 gap-2 h-9 px-4"
                          >
                            <Plus className="w-4 h-4" />
                            Add to Quiz
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleClearSelection} className="h-9 px-3 text-xs font-bold hover:bg-primary/5">
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

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
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="flex gap-4 items-center p-4 border rounded-lg animate-pulse">
                          <Skeleton className="w-5 h-5 rounded" />
                          <Skeleton className="w-8 h-8 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4 rounded" />
                            <Skeleton className="h-3 w-1/4 rounded" />
                          </div>
                        </div>
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
                    <div className="space-y-4">
                      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                        {/* Table Header */}
                        <div className="grid grid-cols-[auto_auto_1fr_150px_130px] gap-4 p-4 bg-muted/50 border-b font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                          <div className="w-6"></div>
                          <div className="w-8 text-center text-xs">#</div>
                          <div className="text-xs">Question</div>
                          <div className="text-center text-xs">Subject/Topic</div>
                          <div className="text-center text-xs">Actions</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-border/50">
                          {filteredQuestions.map((q, index) => (
                            <div
                              key={q.id}
                              className={`grid grid-cols-[auto_auto_1fr_150px_130px] gap-4 p-4 items-center hover:bg-muted/30 transition-colors ${selectedQuestionIds.has(q.id) ? "bg-primary/5" : ""
                                }`}
                            >
                              <Checkbox
                                checked={selectedQuestionIds.has(q.id)}
                                onCheckedChange={() => handleToggleQuestion(q.id)}
                              />
                              <div className="w-8 text-xs font-bold text-muted-foreground text-center">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2" title={q.question}>
                                  {q.question}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                  <span>{q.language.toUpperCase()}</span>
                                  <span>• Used {q.times_used} times</span>
                                  {q.is_public && (
                                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                      <Globe className="w-3 h-3" />
                                      Public
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-center">
                                <ClassificationBadges
                                  subject={q.subject}
                                  topic={q.topic}
                                  compact={true}
                                />
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAddToQuiz(q)}
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 transition-all active:scale-95"
                                  title="Add to Quiz"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                {(q.user_id === currentUserId || isSuperAdmin) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
              <TelegramShare
                quiz={quiz}
                initialChatId={
                  selectedChannel && selectedChannel !== "all"
                    ? channels.find(ch => ch.id === selectedChannel)?.telegram_channel_id || undefined
                    : undefined
                }
                initialChannelId={
                  selectedChannel && selectedChannel !== "all"
                    ? selectedChannel
                    : undefined
                }
              />
            </div>
            <QuizOverview quiz={quiz} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
