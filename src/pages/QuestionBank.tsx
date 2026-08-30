import { useState, useEffect, useCallback, useRef } from "react";
import { Database, RefreshCw, Search, Trash2, FileText, List, Zap, Download, Pencil, ChevronLeft, ChevronRight, ArrowDownAz, ArrowUpAz, Globe, Lock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { QuestionBankService, QuestionBankItem, QuestionBankFilters, QuestionBankStatistics } from "@/services/questionBankService";
import { ClassificationMetadataService } from "@/services/classificationMetadataService";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddQuestionDialog } from "@/components/AddQuestionDialog";
import { AIQuestionGenerator } from "@/components/AIQuestionGenerator";
import { PDFQuestionGenerator } from "@/components/PDFQuestionGenerator";
import { QuestionSelectionDialog } from "@/components/QuestionSelectionDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { TelegramShareQuestionBank } from "@/components/TelegramShareQuestionBank";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { ParsedQuestion } from "@/utils/questionParser";
import { EditQuestionDialog } from "@/components/EditQuestionDialog";
import { ClassificationBadges } from "@/components/ClassificationBadges";
import { QuestionFilters } from "@/components/QuestionFilters";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function QuestionBank() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<QuestionBankFilters>({ includePublic: true });
  const [stats, setStats] = useState<QuestionBankStatistics | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(20);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  interface GeneratedQuestion { question: string; options: string[]; correct_option_index: number; explanation?: string; }
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [defaultTopic, setDefaultTopic] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [subjectsWithCounts, setSubjectsWithCounts] = useState<{ subject: string; count: number }[]>([]);
  const [fullSubjects, setFullSubjects] = useState<any[]>([]);
  const [fullTopics, setFullTopics] = useState<any[]>([]);
  const [topicsWithCounts, setTopicsWithCounts] = useState<{ topic: string; count: number }[]>([]);
  const { toast } = useToast();
  const { canAccess } = useSubscription();
  const hasAIAccess = canAccess("question_bank", "ai_generate");
  const hasPDFAccess = canAccess("question_bank", "pdf_generate");

  const applyStatistics = useCallback((statistics: QuestionBankStatistics) => {
    setStats(statistics);
    setTopicsWithCounts(Object.entries(statistics.byTopic).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count));
    setSubjectsWithCounts(Object.entries(statistics.bySubject).map(([subject, count]) => ({ subject, count })).sort((a, b) => b.count - a.count));
  }, []);

  const loadQuestions = useCallback(async (page = currentPage, query = searchQuery) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const offset = (page - 1) * pageSize;
      const { data, count } = await QuestionBankService.getQuestions(user.id, filters, pageSize, offset, query, sortOrder);
      setQuestions(data);
      setTotalCount(count ?? 0);
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load questions", variant: "destructive" });
    } finally { setLoading(false); }
  }, [filters, pageSize, toast, sortOrder, currentPage, searchQuery]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required");
      const statistics = await QuestionBankService.getStatistics(user.id, true);
      applyStatistics(statistics);
    } catch (error: unknown) {
      setStats(null);
      setTopicsWithCounts([]);
      setSubjectsWithCounts([]);
      toast({ title: "Stats unavailable", description: error instanceof Error ? error.message : "Failed to load Question Bank statistics", variant: "destructive" });
    } finally { setStatsLoading(false); }
  }, [applyStatistics, toast]);

  const loadClassificationData = useCallback(async () => {
    try {
      const [allSubjectsRes, allTopicsRes] = await Promise.allSettled([ClassificationMetadataService.getSubjects(), ClassificationMetadataService.getAllTopics()]);
      setFullSubjects(allSubjectsRes.status === "fulfilled" ? allSubjectsRes.value : []);
      setFullTopics(allTopicsRes.status === "fulfilled" ? allTopicsRes.value : []);
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load subjects and topics", variant: "destructive" });
    }
  }, [toast]);

  const refreshAll = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadQuestions(currentPage, searchQuery), loadStats(), loadClassificationData()]);
      if (showToast) toast({ title: "Refreshed", description: "Question Bank updated from the database." });
    } finally { setIsRefreshing(false); }
  }, [currentPage, searchQuery, loadQuestions, loadStats, loadClassificationData, toast]);

  const handleAddSubject = async (name: string) => { if (!currentUserId) return; try { await ClassificationMetadataService.createSubject(name, currentUserId); await Promise.all([loadClassificationData(), loadStats()]); toast({ title: "Success", description: `Subject "${name}" created successfully` }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to create subject", variant: "destructive" }); } };
  const handleEditSubject = async (oldName: string, newName: string) => { try { const subject = fullSubjects.find(s => s.name === oldName); if (subject) await ClassificationMetadataService.updateSubject(subject.id, { name: newName }); const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.from("question_banks").update({ subject: newName } as any).eq("user_id", user.id).eq("subject", oldName); await Promise.all([loadClassificationData(), loadStats(), loadQuestions(currentPage, searchQuery)]); toast({ title: "Success", description: `Subject updated to "${newName}"` }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to edit subject", variant: "destructive" }); } };
  const handleDeleteSubject = async (name: string) => { try { const subject = fullSubjects.find(s => s.name === name); if (subject) await ClassificationMetadataService.deleteSubject(subject.id); const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.from("question_banks").update({ subject: "" } as any).eq("user_id", user.id).eq("subject", name); await Promise.all([loadClassificationData(), loadStats(), loadQuestions(currentPage, searchQuery)]); toast({ title: "Success", description: `Subject "${name}" removed successfully` }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to delete subject", variant: "destructive" }); } };
  const handleEditTopic = async (oldName: string, newName: string) => { try { const topic = fullTopics.find(t => t.name === oldName); if (topic) await ClassificationMetadataService.updateTopic(topic.id, newName); const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.from("question_banks").update({ topic: newName } as any).eq("user_id", user.id).eq("topic", oldName); await Promise.all([loadClassificationData(), loadStats(), loadQuestions(currentPage, searchQuery)]); toast({ title: "Success", description: `Topic updated to "${newName}"` }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to edit topic", variant: "destructive" }); } };
  const handleDeleteTopic = async (name: string) => { try { const topic = fullTopics.find(t => t.name === name); if (topic) await ClassificationMetadataService.deleteTopic(topic.id); const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.from("question_banks").update({ topic: "" } as any).eq("user_id", user.id).eq("topic", name); await Promise.all([loadClassificationData(), loadStats(), loadQuestions(currentPage, searchQuery)]); toast({ title: "Success", description: `Topic "${name}" removed successfully` }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to delete topic", variant: "destructive" }); } };
  const handleAddTopic = async (subjectId: string, name: string) => { if (!currentUserId) return; try { await ClassificationMetadataService.createTopic(subjectId, name, currentUserId); await Promise.all([loadClassificationData(), loadStats()]); toast({ title: "Success", description: `Topic "${name}" created successfully` }); } catch (error: any) { toast({ title: "Error", description: error.message || "Failed to create topic", variant: "destructive" }); } };

  useEffect(() => { loadQuestions(currentPage, searchQuery); loadStats(); loadClassificationData(); }, [currentPage, filters, loadQuestions, loadStats, loadClassificationData, searchQuery]);
  useEffect(() => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); searchTimeoutRef.current = setTimeout(() => { setCurrentPage(1); loadQuestions(1, searchQuery); }, 500); return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); }; }, [searchQuery]);

  const handleRefresh = async () => { await refreshAll(true); };
  const confirmDelete = async () => { if (!deleteQuestionId) return; try { const { data: { user } } = await supabase.auth.getUser(); if (!user) return; await QuestionBankService.deleteQuestion(deleteQuestionId, user.id); await refreshAll(false); setDeleteQuestionId(null); toast({ title: "Deleted", description: "Question deleted successfully" }); } catch (error: unknown) { toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete question", variant: "destructive" }); } };
  const handleQuestionsGenerated = (generatedQs: GeneratedQuestion[], topic?: string, _difficulty?: string, language?: string) => { setGeneratedQuestions(generatedQs); setDefaultTopic(topic || ""); setDefaultLanguage(language || "en"); };
  const handleQuestionsSaved = async () => { setGeneratedQuestions([]); await refreshAll(false); };
  const handleBulkUpload = async (questionsToUpload: ParsedQuestion[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to upload questions.");
      await QuestionBankService.bulkAddQuestions(
        user.id,
        questionsToUpload.map((q) => ({
          question: q.question,
          options: q.options,
          correct_option_index: q.correct_option_index,
          explanation: q.explanation || undefined,
          subject: q.subject || "GK",
          topic: q.topic || "",
          language: "bn",
          is_public: false,
          is_active: true,
        }))
      );
      await refreshAll(false);
      toast({
        title: "Success",
        description: `Successfully uploaded ${questionsToUpload.length} questions to the bank.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during bulk upload.",
        variant: "destructive",
      });
      throw error;
    }
  };
  const handleToggleQuestion = (questionId: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(questionId)) {
      next.delete(questionId);
    } else {
      next.add(questionId);
    }
    setSelectedQuestionIds(next);
  };
  const handleClearSelection = () => setSelectedQuestionIds(new Set());
  const handleBulkDelete = async () => { if (!selectedQuestionIds.size) return; const deleted = selectedQuestionIds.size; try { const { data: { user } = {} } = await supabase.auth.getUser(); if (!user) return; for (const id of selectedQuestionIds) await QuestionBankService.deleteQuestion(id, user.id); setSelectedQuestionIds(new Set()); await refreshAll(false); toast({ title: "Bulk Delete Complete", description: `Successfully deleted ${deleted} questions.` }); } catch (error: unknown) { toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to delete some questions", variant: "destructive" }); } };
  const handleEdit = (question: QuestionBankItem) => { setEditingQuestion(question); setIsEditDialogOpen(true); };
  const filteredQuestions = questions;
  const handleExportQuestions = () => { if (!filteredQuestions.length) { toast({ title: "No questions to export", variant: "destructive" }); return; } let exportText = `Question Bank Export\nTotal Questions: ${filteredQuestions.length}\n${"=".repeat(50)}\n\n`; filteredQuestions.forEach((q, idx) => { exportText += `${idx + 1}. ${q.question}\n`; q.options.forEach((opt, i) => { exportText += `   ${String.fromCharCode(97 + i)}) ${opt}\n`; }); exportText += `   Correct Answer: ${String.fromCharCode(97 + q.correct_option_index)}) ${q.options[q.correct_option_index]}\n`; if (q.explanation) exportText += `   Explanation: ${q.explanation}\n`; exportText += "\n"; }); const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `question_bank_export_${new Date().toISOString().slice(0, 10)}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); toast({ title: "Exported!", description: `${filteredQuestions.length} questions exported to file.` }); };

  const handleFiltersChange = (newFilters: QuestionBankFilters) => {
    setCurrentPage(1);
    setFilters(newFilters);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2"><Database className="w-6 h-6 md:w-10 md:h-10" />Question Bank</h1>
            <p className="text-sm md:text-base text-muted-foreground font-medium">Total: <span className="text-foreground font-bold">{statsLoading ? "—" : stats?.total ?? 0}</span>{searchQuery && <span className="ml-1 md:ml-2">({totalCount} matching)</span>}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} className="gap-1 md:gap-2 font-bold border-2">{sortOrder === "desc" ? <ArrowDownAz className="w-4 h-4" /> : <ArrowUpAz className="w-4 h-4" />}<span className="hidden sm:inline">{sortOrder === "desc" ? "Newest" : "Oldest"}</span></Button>
            <Button variant="outline" size="sm" onClick={handleExportQuestions} disabled={!filteredQuestions.length} className="gap-1 md:gap-2 font-bold border-2"><Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span></Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1 md:gap-2 font-bold border-2"><RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span></Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Question Bank Statistics</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{statsLoading ? "—" : stats?.total ?? 0}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Subjects</div><div className="text-2xl font-bold">{statsLoading ? "—" : subjectsWithCounts.length}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Topics</div><div className="text-2xl font-bold">{statsLoading ? "—" : topicsWithCounts.length}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Public</div><div className="text-2xl font-bold">{statsLoading ? "—" : stats?.publicCount ?? 0}</div></div>
              <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Private</div><div className="text-2xl font-bold">{statsLoading ? "—" : stats?.privateCount ?? 0}</div></div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className={`grid w-full h-auto ${hasAIAccess && hasPDFAccess ? "grid-cols-3" : hasAIAccess ? "grid-cols-2" : "grid-cols-1"}`}>
            <TabsTrigger value="questions" className="gap-1 md:gap-2 text-xs md:text-sm py-2"><List className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline">My</span> Questions</TabsTrigger>
            {hasAIAccess && <TabsTrigger value="ai-generate" className="gap-1 md:gap-2 text-xs md:text-sm py-2"><Zap className="w-3 h-3 md:w-4 md:h-4" />AI <span className="hidden sm:inline">Generate</span></TabsTrigger>}
            {hasPDFAccess && <TabsTrigger value="pdf-generate" className="gap-1 md:gap-2 text-xs md:text-sm py-2"><FileText className="w-3 h-3 md:w-4 md:h-4" />PDF <span className="hidden sm:inline">Generate</span></TabsTrigger>}
          </TabsList>
          <TabsContent value="questions" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search questions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
              <div className="flex gap-2"><BulkUploadDialog onUpload={handleBulkUpload} fullSubjects={fullSubjects} fullTopics={fullTopics} currentCount={stats?.total || 0} /><AddQuestionDialog onQuestionAdded={handleRefresh} currentCount={stats?.total || 0} /><TelegramShareQuestionBank selectedQuestionIds={selectedQuestionIds} onClearSelection={handleClearSelection} /></div>
            </div>
            <QuestionFilters 
              filters={filters} 
              onFiltersChange={handleFiltersChange} 
              subjectsWithCounts={subjectsWithCounts} 
              topicsWithCounts={topicsWithCounts}
              fullSubjects={fullSubjects}
              fullTopics={fullTopics}
              subjectTopics={stats?.subjectTopics}
              totalCount={stats?.total || 0}
              filteredCount={totalCount}
              onAddSubject={handleAddSubject}
              onEditSubject={handleEditSubject}
              onDeleteSubject={handleDeleteSubject}
              onAddTopic={handleAddTopic}
              onEditTopic={handleEditTopic}
              onDeleteTopic={handleDeleteTopic}
              privateOnly={false}
            />
            {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div> : filteredQuestions.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">No questions found.</CardContent></Card> : <div className="space-y-3">{filteredQuestions.map((q, idx) => <Card key={q.id}><CardContent className="p-4"><div className="flex items-start gap-3"><Checkbox checked={selectedQuestionIds.has(q.id)} onCheckedChange={() => handleToggleQuestion(q.id)} /><div className="flex-1 min-w-0"><div className="font-semibold">{(currentPage - 1) * pageSize + idx + 1}. {q.question}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2 text-sm">{(Array.isArray(q.options) ? q.options : []).map((option, i) => <div key={i} className={i === q.correct_option_index ? "font-semibold" : ""}>{String.fromCharCode(65 + i)}. {option}{i === q.correct_option_index ? " ✓" : ""}</div>)}</div><div className="flex flex-wrap gap-2 mt-2"><ClassificationBadges subject={q.subject} topic={q.topic} /><span className="text-xs text-muted-foreground">{q.language}</span>{q.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}</div></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleEdit(q)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteQuestionId(q.id)}><Trash2 className="w-4 h-4" /></Button></div></div></CardContent></Card>)}</div>}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4"><div className="text-sm text-muted-foreground">Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}</div><div className="flex items-center gap-2"><Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent></Select><Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button><span className="text-sm">Page {currentPage}</span><Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * pageSize >= totalCount}><ChevronRight className="w-4 h-4" /></Button></div></div>
          </TabsContent>
          <TabsContent value="ai-generate" className="mt-6"><AIQuestionGenerator onQuestionsGenerated={handleQuestionsGenerated} /></TabsContent>
          <TabsContent value="pdf-generate" className="mt-6"><PDFQuestionGenerator onQuestionsGenerated={handleQuestionsGenerated} /></TabsContent>
        </Tabs>

        <AlertDialog open={!!deleteQuestionId} onOpenChange={open => !open && setDeleteQuestionId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete question?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete selected questions?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { setShowBulkDeleteDialog(false); await handleBulkDelete(); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <QuestionSelectionDialog open={showSelectionDialog} onOpenChange={setShowSelectionDialog} questions={generatedQuestions} onSaved={handleQuestionsSaved} defaultTopic={defaultTopic} defaultLanguage={defaultLanguage} />
        {editingQuestion && <EditQuestionDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} question={editingQuestion} onSaved={handleRefresh} />}
      </div>
    </DashboardLayout>
  );
}
