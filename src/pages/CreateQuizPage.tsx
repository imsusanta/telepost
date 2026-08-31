import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Database, Globe, RefreshCw, Search, Sparkles, Trash2, Plus } from "lucide-react";
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

export default function CreateQuizPage() {
  const { quiz, isGenerating, generateQuiz, resetQuiz, setQuiz } = useQuizGeneration();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [isQuestionsRefreshing, setIsQuestionsRefreshing] = useState(false);
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  const [filters, setFilters] = useState<QuestionBankFilters>({ includePublic: true });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [stats, setStats] = useState<{ total: number; byTopic: Record<string, number>; bySubject: Record<string, number>; byLanguage: Record<string, number>; unclassifiedCount: number; publicCount: number; privateCount: number } | null>(null);
  const [activeTab, setActiveTab] = useState("ai");
  const { canAccess, getLimit, loading: isLoadingSubscription, isSuperAdmin: superAdminRole } = useSubscription();
  const hasAiQuiz = canAccess('create_quiz', 'ai_generated');
  const hasManualInput = canAccess('create_quiz', 'manual_input');
  const hasQuestionBank = canAccess('create_quiz', 'question_bank');

  useEffect(() => {
    if (!isLoadingSubscription && !hasAiQuiz && activeTab === "ai") {
      if (hasManualInput) setActiveTab("manual"); else if (hasQuestionBank) setActiveTab("question-bank");
    }
  }, [hasAiQuiz, hasManualInput, hasQuestionBank, activeTab, isLoadingSubscription]);

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [subjectsWithCounts, setSubjectsWithCounts] = useState<{ subject: string; count: number }[]>([]);
  const [topicsWithCounts, setTopicsWithCounts] = useState<{ topic: string; count: number }[]>([]);
  const [fullSubjects, setFullSubjects] = useState<any[]>([]);
  const [fullTopics, setFullTopics] = useState<any[]>([]);

  const loadChannels = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;
      setChannels(await ChannelService.getUserChannels(user.id));
      setCurrentUserId(user.id);
      setIsSuperAdmin(await checkSuperAdminStatus());
    } catch (error) { console.error("Failed to load channels:", error); }
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;
      const result = await QuestionBankService.getQuestions(user.id, filters, 100);
      setQuestions(result.data);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load questions", variant: "destructive" });
    } finally { setQuestionsLoading(false); }
  }, [filters, toast]);

  const loadStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      setStats(await QuestionBankService.getStatistics(user.id, true));
    } catch (error) { console.error("Failed to load stats:", error); }
  }, []);

  const loadClassificationData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const [subjectsRes, topicsRes, allSubjectsRes, allTopicsRes] = await Promise.allSettled([
        ClassificationService.getSubjectsWithCounts(user.id), ClassificationService.getAllTopics(user.id), ClassificationMetadataService.getSubjects(), ClassificationMetadataService.getAllTopics()
      ]);
      setSubjectsWithCounts(subjectsRes.status === 'fulfilled' ? subjectsRes.value : []);
      setTopicsWithCounts(topicsRes.status === 'fulfilled' ? topicsRes.value.map(t => ({ topic: t, count: 0 })) : []);
      setFullSubjects(allSubjectsRes.status === 'fulfilled' ? allSubjectsRes.value : []);
      setFullTopics(allTopicsRes.status === 'fulfilled' ? allTopicsRes.value : []);
    } catch (error) { console.error("Failed to load classification data:", error); }
  }, []);

  useEffect(() => {
    const topicFromUrl = searchParams.get("topic");
    const channelFromUrl = searchParams.get("channel");
    if (channelFromUrl) setSelectedChannel(channelFromUrl);
    Promise.all([loadChannels(), loadQuestions(), loadStats(), loadClassificationData()]).catch((error) => console.error("Failed to initialize quiz page:", error));
    // Topic is consumed by QuizConfigForm via its own input; URL remains the source of truth without changing existing generation flow.
    void topicFromUrl;
  }, [loadChannels, loadQuestions, loadStats, loadClassificationData, searchParams]);

  useEffect(() => {
    if (!activeTab || !filters) return;
    if (questions.length || !questionsLoading) { loadQuestions(); loadStats(); }
  }, [filters]);

  const handleToggleQuestion = (questionId: string) => {
    const next = new Set(selectedQuestionIds); if (next.has(questionId)) next.delete(questionId); else next.add(questionId); setSelectedQuestionIds(next);
  };
  const handleSelectAll = () => setSelectedQuestionIds(selectedQuestionIds.size === filteredQuestions.length ? new Set() : new Set(filteredQuestions.map(q => q.id)));
  const handleClearSelection = () => setSelectedQuestionIds(new Set());
  const handleQuestionsRefresh = async () => { setIsQuestionsRefreshing(true); await loadQuestions(); await loadStats(); setIsQuestionsRefreshing(false); toast({ title: "Refreshed", description: "Question bank updated" }); };
  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm("Are you sure you want to delete this question?")) return;
    try { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; await QuestionBankService.deleteQuestion(questionId, user.id); setQuestions(questions.filter(q => q.id !== questionId)); await loadStats(); toast({ title: "Deleted", description: "Question deleted successfully" }); }
    catch (error) { toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete question", variant: "destructive" }); }
  };
  const handleStartQuiz = useCallback(async (config: QuizConfigType) => { if (config.channelId) setSelectedChannel(config.channelId); await generateQuiz(config); }, [generateQuiz]);
  const handleQuizCreated = useCallback((createdQuiz: Parameters<typeof setQuiz>[0]) => setQuiz(createdQuiz), [setQuiz]);
  const handleAddToQuiz = useCallback((q: QuestionBankItem) => {
    const quizQuestion: QuizQuestion = { id: (quiz?.questions.length || 0) + 1, question: q.question, options: q.options, correct_option_index: q.correct_option_index, explanation: q.explanation };
    setQuiz(quiz ? { ...quiz, questions: [...quiz.questions, quizQuestion] } : { request_id: `manual-${Date.now()}`, topic: q.topic || "Manual Selection", questions: [quizQuestion], metadata: { generated_at: new Date().toISOString() } });
    toast({ title: "Added to Quiz", description: "Question added to your current quiz." });
  }, [quiz, setQuiz, toast]);
  const handleBulkAddToQuiz = useCallback(() => {
    if (!selectedQuestionIds.size) return;
    const selectedQuestions = questions.filter(q => selectedQuestionIds.has(q.id));
    const quizQuestions: QuizQuestion[] = selectedQuestions.map((q, idx) => ({ id: (quiz?.questions.length || 0) + idx + 1, question: q.question, options: q.options, correct_option_index: q.correct_option_index, explanation: q.explanation }));
    setQuiz(quiz ? { ...quiz, questions: [...quiz.questions, ...quizQuestions] } : { request_id: `manual-${Date.now()}`, topic: selectedQuestions[0]?.topic || "Manual Selection", questions: quizQuestions, metadata: { generated_at: new Date().toISOString() } });
    setSelectedQuestionIds(new Set()); toast({ title: "Questions Added", description: `Added ${quizQuestions.length} questions to the quiz.` });
  }, [quiz, questions, selectedQuestionIds, setQuiz, toast]);

  const filteredQuestions = useMemo(() => questions.filter(q => questionSearchQuery === "" || q.question.toLowerCase().includes(questionSearchQuery.toLowerCase()) || q.topic.toLowerCase().includes(questionSearchQuery.toLowerCase()) || q.options.some(opt => opt.toLowerCase().includes(questionSearchQuery.toLowerCase()))), [questions, questionSearchQuery]);
  const handleSelectRange = useCallback(() => {
    const from = parseInt(rangeFrom) || 1; const to = parseInt(rangeTo) || filteredQuestions.length;
    if (from > 0 && to >= from && to <= filteredQuestions.length) { const next = new Set<string>(); for (let i = from - 1; i < to; i++) next.add(filteredQuestions[i].id); setSelectedQuestionIds(next); toast({ title: "Range Selected", description: `Selected questions ${from} to ${to}` }); }
    else toast({ title: "Invalid Range", description: `Please enter valid range (1 to ${filteredQuestions.length})`, variant: "destructive" });
  }, [rangeFrom, rangeTo, filteredQuestions, toast]);

  if (isGenerating) return <DashboardLayout><div className="max-w-4xl mx-auto"><LoadingState message="Generating your quiz with AI..." size="lg" /></div></DashboardLayout>;

  return <DashboardLayout><div className="max-w-6xl mx-auto">{!quiz ? <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex items-center gap-3"><div className="p-2 md:p-3 bg-primary/10 rounded-lg"><Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" /></div><div><h1 className="text-2xl md:text-4xl font-bold">Create Quiz</h1><p className="text-sm md:text-base text-muted-foreground">Generate AI-powered quizzes, manage your question bank, and reuse saved Knowledge Base topics.</p></div></div>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full mb-6 h-auto grid-cols-${[hasAiQuiz, hasManualInput, hasQuestionBank].filter(Boolean).length || 1} md:grid-cols-${[hasAiQuiz, hasManualInput, hasQuestionBank].filter(Boolean).length || 1}`}>
        {(hasAiQuiz || superAdminRole) && <TabsTrigger value="ai" className="gap-1 md:gap-2 text-xs md:text-sm py-2"><Sparkles className="h-3 w-3 md:h-4 md:w-4" /><span className="hidden sm:inline">AI</span> Generated</TabsTrigger>}
        {(hasManualInput || superAdminRole) && <TabsTrigger value="manual" className="text-xs md:text-sm py-2">Manual Input</TabsTrigger>}
        {(hasQuestionBank || superAdminRole) && <TabsTrigger value="question-bank" className="gap-1 md:gap-2 text-xs md:text-sm py-2"><Database className="h-3 w-3 md:h-4 md:w-4" /><span className="hidden sm:inline">Question</span> Bank</TabsTrigger>}
      </TabsList>
      <TabsContent value="ai" className="animate-in fade-in duration-300"><QuizConfigForm onStartQuiz={handleStartQuiz} isGenerating={isGenerating} maxQuestions={getLimit("max_questions_per_quiz") ?? undefined} /></TabsContent>
      {(hasManualInput || superAdminRole) && <TabsContent value="manual"><div className="space-y-6"><div className="flex justify-between items-center flex-wrap gap-4"><div><h2 className="text-2xl font-bold flex items-center gap-2"><Plus className="w-6 h-6" />Manual Quiz Input</h2><p className="text-muted-foreground">Create quizzes manually by adding questions one by one.</p></div><div className="w-48"><Label htmlFor="manual-channel-select" className="text-sm mb-2 block">Target Channel</Label><Select value={selectedChannel || "all"} onValueChange={setSelectedChannel}><SelectTrigger id="manual-channel-select"><SelectValue placeholder="Select channel" /></SelectTrigger><SelectContent><SelectItem value="all">All Channels</SelectItem>{channels.map((channel) => <SelectItem key={channel.id} value={channel.id}>{channel.name || "Unnamed Channel"}</SelectItem>)}</SelectContent></Select></div></div><ManualQuizInput onQuizCreated={handleQuizCreated} isGenerating={false} /></div></TabsContent>}
      {(hasQuestionBank || superAdminRole) && <TabsContent value="question-bank"><div className="space-y-6"><div className="flex justify-between items-center flex-wrap gap-4"><div><h2 className="text-2xl font-bold flex items-center gap-2"><Database className="w-6 h-6" />Question Bank</h2><p className="text-muted-foreground">{stats?.total || 0} questions available{questionSearchQuery && ` (${filteredQuestions.length} matching)`}</p></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search questions..." value={questionSearchQuery} onChange={(e) => setQuestionSearchQuery(e.target.value)} className="pl-10 w-64" /></div><Button variant="outline" onClick={handleQuestionsRefresh} disabled={isQuestionsRefreshing}><RefreshCw className={`w-4 h-4 ${isQuestionsRefreshing ? "animate-spin" : ""}`} />Refresh</Button></div></div><QuestionFilters filters={filters} onFiltersChange={setFilters} subjectsWithCounts={subjectsWithCounts} topicsWithCounts={topicsWithCounts} fullSubjects={fullSubjects} fullTopics={fullTopics} totalCount={stats?.total || 0} filteredCount={filteredQuestions.length} />{filteredQuestions.length > 0 && <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-muted/30 rounded-lg border"><div className="flex flex-wrap items-center gap-2 md:gap-3"><div className="flex items-center gap-2"><Checkbox id="select-all" checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0} onCheckedChange={handleSelectAll} /><label htmlFor="select-all" className="text-xs md:text-sm font-medium cursor-pointer">Select All</label></div><div className="flex items-center gap-1.5 md:gap-2"><span className="text-xs md:text-sm text-muted-foreground hidden sm:inline">Range:</span><Input type="number" placeholder="From" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="w-16 h-8 text-xs" min="1" /><span className="text-xs text-muted-foreground">-</span><Input type="number" placeholder="To" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="w-16 h-8 text-xs" min="1" /><Button variant="outline" size="sm" onClick={handleSelectRange} className="h-8 text-xs">Go</Button></div></div>{selectedQuestionIds.size > 0 && <div className="flex items-center gap-3"><span className="text-sm font-bold text-primary">{selectedQuestionIds.size} selected</span><Button onClick={handleBulkAddToQuiz} className="gap-2 h-9"><Plus className="w-4 h-4" />Add to Quiz</Button><Button variant="ghost" size="sm" onClick={handleClearSelection}>Clear</Button></div>}</div>}
        {stats && <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Questions</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Topics</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{Object.keys(stats.byTopic).length}</div></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Languages</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{Object.keys(stats.byLanguage).length}</div></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm">Average Usage</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{stats.total > 0 ? Math.round(questions.reduce((sum, q) => sum + q.times_used, 0) / stats.total) : 0}</div></CardContent></Card></div>}
        {questionsLoading ? <div className="space-y-4">{[1,2,3,4,5].map(n => <div key={n} className="flex gap-4 items-center p-4 border rounded-lg animate-pulse"><Skeleton className="w-5 h-5 rounded" /><Skeleton className="w-8 h-8 rounded" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4 rounded" /><Skeleton className="h-3 w-1/4 rounded" /></div></div>)}</div> : filteredQuestions.length === 0 ? <Card><CardContent className="py-12 text-center"><Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-xl font-semibold mb-2">{questionSearchQuery ? "No matching questions" : "No questions found"}</h3><p className="text-muted-foreground">Add questions from the AI generator or manually.</p></CardContent></Card> : <div className="border rounded-lg overflow-hidden bg-card shadow-sm"><div className="grid grid-cols-[auto_auto_1fr_150px_130px] gap-4 p-4 bg-muted/50 border-b font-semibold text-sm text-muted-foreground uppercase tracking-wider"><div className="w-6" /><div className="w-8 text-center text-xs">#</div><div className="text-xs">Question</div><div className="text-center text-xs">Subject/Topic</div><div className="text-center text-xs">Actions</div></div><div className="divide-y divide-border/50">{filteredQuestions.map((q, index) => <div key={q.id} className={`grid grid-cols-[auto_auto_1fr_150px_130px] gap-4 p-4 items-center hover:bg-muted/30 ${selectedQuestionIds.has(q.id) ? "bg-primary/5" : ""}`}><Checkbox checked={selectedQuestionIds.has(q.id)} onCheckedChange={() => handleToggleQuestion(q.id)} /><div className="w-8 text-xs font-bold text-muted-foreground text-center">{index + 1}</div><div className="min-w-0"><p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{q.question}</p><div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground font-medium"><span>{q.language.toUpperCase()}</span><span>• Used {q.times_used} times</span>{q.is_public && <span className="flex items-center gap-1 text-emerald-600 font-bold"><Globe className="w-3 h-3" />Public</span>}</div></div><div className="flex justify-center"><ClassificationBadges subject={q.subject} topic={q.topic} compact={true} /></div><div className="flex items-center justify-center gap-1"><Button variant="ghost" size="icon" onClick={() => handleAddToQuiz(q)} className="h-8 w-8 text-primary"><Plus className="w-4 h-4" /></Button>{(q.user_id === currentUserId || isSuperAdmin) && <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>}</div></div>)}</div></div>}
      </div></TabsContent>}
    </Tabs>
  </div> : <div className="space-y-6 animate-in fade-in duration-500"><div className="flex items-center justify-between"><Button variant="outline" onClick={resetQuiz} className="gap-2"><ArrowLeft className="w-4 h-4" />Create New Quiz</Button><TelegramShare quiz={quiz} initialChatId={selectedChannel && selectedChannel !== "all" ? channels.find(ch => ch.id === selectedChannel)?.telegram_channel_id || undefined : undefined} initialChannelId={selectedChannel && selectedChannel !== "all" ? selectedChannel : undefined} /></div><QuizOverview quiz={quiz} /></div>}</div></DashboardLayout>;
}
