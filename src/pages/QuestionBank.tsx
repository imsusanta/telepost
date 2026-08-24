import { useState, useEffect, useCallback, useRef } from "react";
import { Database, RefreshCw, Search, Trash2, Sparkles, FileText, List, Zap, Download, Pencil, ChevronLeft, ChevronRight, ArrowDownAz, ArrowUpAz, Globe, Lock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { QuestionBankService, QuestionBankItem, QuestionBankFilters } from "@/services/questionBankService";
import { ClassificationMetadataService } from "@/services/classificationMetadataService";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddQuestionDialog } from "@/components/AddQuestionDialog";
import { AIQuestionGenerator } from "@/components/AIQuestionGenerator";
import { AIGeneratedQuestionsList } from "@/components/AIGeneratedQuestionsList";
import { PDFQuestionGenerator } from "@/components/PDFQuestionGenerator";
import { QuestionSelectionDialog } from "@/components/QuestionSelectionDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { TelegramShareQuestionBank } from "@/components/TelegramShareQuestionBank";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { ParsedQuestion } from "@/utils/questionParser";
import { EditQuestionDialog } from "@/components/EditQuestionDialog";
import { ClassificationBadges } from "@/components/ClassificationBadges";
import { QuestionFilters } from "@/components/QuestionFilters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function QuestionBank() {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<QuestionBankFilters>({
    includePublic: true,
  });
  const [stats, setStats] = useState<{
    total: number;
    byTopic: Record<string, number>;
    bySubject: Record<string, number>;
    byDifficulty: Record<string, number>;
    byLanguage: Record<string, number>;
    unclassifiedCount: number;
    publicCount: number;
    privateCount: number;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(20);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  interface GeneratedQuestion {
    question: string;
    options: string[];
    correct_option_index: number;
    explanation?: string;
  }
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [aiListRefreshKey, setAiListRefreshKey] = useState(0);
  const [defaultTopic, setDefaultTopic] = useState("");
  const [defaultDifficulty] = useState("medium");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [subjectsWithCounts, setSubjectsWithCounts] = useState<{ subject: string; count: number }[]>([]);
  const [fullSubjects, setFullSubjects] = useState<any[]>([]);
  const [fullTopics, setFullTopics] = useState<any[]>([]);
  const [topicsWithCounts, setTopicsWithCounts] = useState<{ topic: string; count: number }[]>([]);
  const [isBulkMoveDialogOpen, setIsBulkMoveDialogOpen] = useState(false);
  const [bulkMoveSubject, setBulkMoveSubject] = useState("");
  const [bulkMoveTopic, setBulkMoveTopic] = useState("");
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const { toast } = useToast();
  const { canAccess } = useSubscription();

  const hasAIAccess = canAccess('question_bank', 'ai_generate');
  const hasPDFAccess = canAccess('question_bank', 'pdf_generate');

  const loadQuestions = useCallback(async (page = currentPage, query = searchQuery) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Track the current user ID for ownership checks
      setCurrentUserId(user.id);

      const offset = (page - 1) * pageSize;
      const { data, count } = await QuestionBankService.getQuestions(user.id, filters, pageSize, offset, query, sortOrder);
      setQuestions(data);
      setTotalCount(count);

    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize, toast, sortOrder, currentPage, searchQuery]);

  const loadStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Include public questions in stats (always true to show complete stats)
      const statistics = await QuestionBankService.getStatistics(user.id, true);
      setStats(statistics);

      // Derive topic and subject counts directly from stats (most reliable source)
      const topicCounts = Object.entries(statistics.byTopic)
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => b.count - a.count);
      setTopicsWithCounts(topicCounts);

      const subjectCounts = Object.entries(statistics.bySubject)
        .map(([subject, count]) => ({ subject, count }))
        .sort((a, b) => b.count - a.count);
      setSubjectsWithCounts(subjectCounts);
    } catch (error: unknown) {
      toast({
        title: "Warning",
        description: "Failed to load statistics",
        variant: "default",
      });
    }
  }, [toast]);


  const loadClassificationData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [allSubjectsRes, allTopicsRes] = await Promise.allSettled([
        ClassificationMetadataService.getSubjects(),
        ClassificationMetadataService.getAllTopics()
      ]);

      const allSubjects = allSubjectsRes.status === 'fulfilled' ? allSubjectsRes.value : [];
      const allTopics = allTopicsRes.status === 'fulfilled' ? allTopicsRes.value : [];

      // Check if any metadata calls failed due to missing tables
      const tableMissing = (allSubjectsRes.status === 'rejected' && (allSubjectsRes.reason?.message?.includes('PGRST116') || allSubjectsRes.reason?.message?.includes('not found') || allSubjectsRes.reason?.message?.includes('classification_subjects'))) ||
        (allTopicsRes.status === 'rejected' && (allTopicsRes.reason?.message?.includes('PGRST116') || allTopicsRes.reason?.message?.includes('not found') || allTopicsRes.reason?.message?.includes('classification_topics')));

      if (tableMissing) {
        console.warn("Classification tables missing. Please run database migrations.");
        const rawError = (allSubjectsRes.status === 'rejected' ? allSubjectsRes.reason?.message : '') ||
          (allTopicsRes.status === 'rejected' ? allTopicsRes.reason?.message : '');
        toast({
          title: "Database Setup Required",
          description: `Error: ${rawError}. Please ensure you've run the SQL in database_fix.md and refreshed the page.`,
          variant: "destructive",
        });
      }

      setFullSubjects(allSubjects);
      setFullTopics(allTopics);
    } catch (error: any) {
      console.error("Failed to load classification data:", error);
      toast({
        title: "Error",
        description: "Failed to load subjects and topics. Please check your database connection.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleAddSubject = async (name: string) => {
    if (!currentUserId) return;
    try {
      await ClassificationMetadataService.createSubject(name, currentUserId);
      toast({
        title: "Success",
        description: `Subject "${name}" created successfully`,
      });
      loadClassificationData();
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create subject",
        variant: "destructive",
      });
    }
  };

  const handleEditSubject = async (oldName: string, newName: string) => {
    try {
      const subject = fullSubjects.find(s => s.name === oldName);
      if (subject) {
        await ClassificationMetadataService.updateSubject(subject.id, { name: newName });
      }

      // Sync rename across existing questions regardless of metadata presence
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('question_banks')
          .update({ subject: newName } as any)
          .eq('user_id', user.id)
          .eq('subject', oldName);
      }

      toast({
        title: "Success",
        description: `Subject updated to "${newName}"`,
      });
      loadClassificationData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to edit subject",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubject = async (name: string) => {
    try {
      const subject = fullSubjects.find(s => s.name === name);
      if (subject) {
        await ClassificationMetadataService.deleteSubject(subject.id);
      }

      // Clear subject from existing questions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('question_banks')
          .update({ subject: "" } as any)
          .eq('user_id', user.id)
          .eq('subject', name);
      }

      toast({
        title: "Success",
        description: `Subject "${name}" removed successfully`,
      });
      loadClassificationData();
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subject",
        variant: "destructive",
      });
    }
  };

  const handleEditTopic = async (oldName: string, newName: string) => {
    try {
      const topic = fullTopics.find(t => t.name === oldName);
      if (topic) {
        await ClassificationMetadataService.updateTopic(topic.id, newName);
      }

      // Sync rename across existing questions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('question_banks')
          .update({ topic: newName } as any)
          .eq('user_id', user.id)
          .eq('topic', oldName);
      }

      toast({
        title: "Success",
        description: `Topic updated to "${newName}"`,
      });
      loadClassificationData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to edit topic",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopic = async (name: string) => {
    try {
      const topic = fullTopics.find(t => t.name === name);
      if (topic) {
        await ClassificationMetadataService.deleteTopic(topic.id);
      }

      // Clear topic from existing questions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('question_banks')
          .update({ topic: "" } as any)
          .eq('user_id', user.id)
          .eq('topic', name);
      }

      toast({
        title: "Success",
        description: `Topic "${name}" removed successfully`,
      });
      loadClassificationData();
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete topic",
        variant: "destructive",
      });
    }
  };

  const handleAddTopic = async (subjectId: string, name: string) => {
    if (!currentUserId) return;
    try {
      await ClassificationMetadataService.createTopic(subjectId, name, currentUserId);
      toast({
        title: "Success",
        description: `Topic "${name}" created successfully`,
      });
      loadClassificationData();
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create topic",
        variant: "destructive",
      });
    }
  };

  const handleBulkMove = async () => {
    if (!bulkMoveSubject || selectedQuestionIds.size === 0) return;

    try {
      setIsBulkMoving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetTopic = bulkMoveTopic === "NO_TOPIC" ? "" : bulkMoveTopic;

      await QuestionBankService.bulkUpdateClassification(
        Array.from(selectedQuestionIds),
        user.id,
        bulkMoveSubject,
        targetTopic
      );

      toast({
        title: "Success",
        description: `Successfully moved ${selectedQuestionIds.size} questions to ${bulkMoveSubject}${targetTopic ? ' > ' + targetTopic : ''}`,
      });

      setIsBulkMoveDialogOpen(false);
      setSelectedQuestionIds(new Set());
      loadQuestions();
      loadStats();
      loadClassificationData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to move questions",
        variant: "destructive",
      });
    } finally {
      setIsBulkMoving(false);
    }
  };

  useEffect(() => {
    loadQuestions(currentPage, searchQuery);
    loadStats();
    loadClassificationData();
  }, [currentPage, filters, loadQuestions, loadStats, loadClassificationData, searchQuery]);


  // Handle search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on new search
      loadQuestions(1, searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);


  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadQuestions();
    await loadStats();
    await loadClassificationData();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Question bank updated",
    });
  };

  // Opens delete confirmation dialog
  const handleDelete = (questionId: string) => {
    setDeleteQuestionId(questionId);
  };

  // Executes the actual deletion
  const confirmDelete = async () => {
    if (!deleteQuestionId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await QuestionBankService.deleteQuestion(deleteQuestionId, user.id);
      setQuestions(questions.filter(q => q.id !== deleteQuestionId));
      toast({
        title: "Deleted",
        description: "Question deleted successfully",
      });
      loadStats();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete question",
        variant: "destructive",
      });
    } finally {
      setDeleteQuestionId(null);
    }
  };

  const handleQuestionsGenerated = (generatedQs: GeneratedQuestion[], topic?: string, _difficulty?: string, language?: string) => {
    setGeneratedQuestions(generatedQs);
    setDefaultTopic(topic || "");
    setDefaultLanguage(language || "en");
    // Trigger refresh of AIGeneratedQuestionsList
    setAiListRefreshKey(prev => prev + 1);
    // setShowSelectionDialog(true); // Disabled for Quick Add experience
  };

  const handleQuestionsSaved = async () => {
    setGeneratedQuestions([]);
    await loadQuestions();
    await loadStats();
  };

  const handleBulkUpload = async (questions: ParsedQuestion[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload questions.",
          variant: "destructive",
        });
        return;
      }

      const formattedQuestions = questions.map(q => ({
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        explanation: q.explanation || undefined,
        subject: q.subject || "GK",
        topic: q.topic || "",
        language: "bn",
        is_public: false,
        is_active: true
      }));

      await QuestionBankService.bulkAddQuestions(user.id, formattedQuestions);

      toast({
        title: "Success",
        description: `Successfully uploaded ${questions.length} questions to the bank.`,
      });

      await handleRefresh();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred during bulk upload.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Question selection handlers
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

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (selectedQuestionIds.size === 0) return;

    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return;

      // Delete all selected questions
      for (const questionId of selectedQuestionIds) {
        await QuestionBankService.deleteQuestion(questionId, user.id);
      }

      setQuestions(questions.filter(q => !selectedQuestionIds.has(q.id)));
      toast({
        title: "Bulk Delete Complete",
        description: `Successfully deleted ${selectedQuestionIds.size} questions.`,
      });
      setSelectedQuestionIds(new Set());
      loadStats();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete some questions",
        variant: "destructive",
      });
    }
  };

  // Toggle single question public status
  const handleTogglePublic = async (question: QuestionBankItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newStatus = !question.is_public;
      await QuestionBankService.updateQuestion(question.id, user.id, { is_public: newStatus });

      setQuestions(questions.map(q =>
        q.id === question.id ? { ...q, is_public: newStatus } : q
      ));

      toast({
        title: newStatus ? "Made Public" : "Made Private",
        description: newStatus
          ? "Question is now visible to all users."
          : "Question is now private.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update question",
        variant: "destructive",
      });
    }
  };

  // Bulk toggle public status
  const handleBulkTogglePublic = async (makePublic: boolean) => {
    if (selectedQuestionIds.size === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const questionId of selectedQuestionIds) {
        await QuestionBankService.updateQuestion(questionId, user.id, { is_public: makePublic });
      }

      setQuestions(questions.map(q =>
        selectedQuestionIds.has(q.id) ? { ...q, is_public: makePublic } : q
      ));

      toast({
        title: makePublic ? "Made Public" : "Made Private",
        description: `${selectedQuestionIds.size} questions are now ${makePublic ? 'public' : 'private'}.`,
      });

      setSelectedQuestionIds(new Set());
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update questions",
        variant: "destructive",
      });
    }
  };

  // Edit question
  const handleEdit = (question: QuestionBankItem) => {
    setEditingQuestion(question);
    setIsEditDialogOpen(true);
  };

  // Duplicate question


  // With server-side pagination and search, the 'questions' state already contains filtered data
  const filteredQuestions = questions;

  // Export questions as formatted text
  const handleExportQuestions = () => {
    if (filteredQuestions.length === 0) {
      toast({ title: "No questions to export", variant: "destructive" });
      return;
    }

    let exportText = `Question Bank Export\nTotal Questions: ${filteredQuestions.length}\n${"=".repeat(50)}\n\n`;

    filteredQuestions.forEach((q, idx) => {
      const questionNumber = idx + 1;
      exportText += `${questionNumber}. ${q.question}\n`;
      q.options.forEach((opt, optIdx) => {
        const optionLetter = String.fromCharCode(97 + optIdx);
        exportText += `   ${optionLetter}) ${opt}\n`;
      });
      const correctLetter = String.fromCharCode(97 + q.correct_option_index);
      exportText += `   Correct Answer: ${correctLetter}) ${q.options[q.correct_option_index]}\n`;
      if (q.explanation) {
        exportText += `   Explanation: ${q.explanation}\n`;
      }
      exportText += `\n`;
    });

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question_bank_export_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Exported!", description: `${filteredQuestions.length} questions exported to file.` });
  };


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6 md:w-10 md:h-10" />
              Question Bank
            </h1>
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              Total: <span className="text-foreground font-bold">{totalCount}</span>
              {searchQuery && <span className="ml-1 md:ml-2">({totalCount} matching)</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="gap-1 md:gap-2 font-bold border-2 hover:bg-muted transition-all active:scale-95"
              title={sortOrder === 'desc' ? "Showing Newest First" : "Showing Oldest First"}
            >
              {sortOrder === 'desc' ? <ArrowDownAz className="w-4 h-4" /> : <ArrowUpAz className="w-4 h-4" />}
              <span className="hidden sm:inline">{sortOrder === 'desc' ? "Newest" : "Oldest"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportQuestions} disabled={filteredQuestions.length === 0} className="gap-1 md:gap-2 font-bold border-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1 md:gap-2 font-bold border-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className={`grid w-full h-auto ${hasAIAccess && hasPDFAccess ? 'grid-cols-3' : hasAIAccess ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="questions" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
              <List className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">My</span> Questions
            </TabsTrigger>
            {hasAIAccess && (
              <TabsTrigger value="ai-generate" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                <Zap className="w-3 h-3 md:w-4 md:h-4" />
                AI <span className="hidden sm:inline">Generate</span>
              </TabsTrigger>
            )}
            {hasPDFAccess && (
              <TabsTrigger value="pdf-generate" className="gap-1 md:gap-2 text-xs md:text-sm py-2">
                <FileText className="w-3 h-3 md:w-4 md:h-4" />
                PDF <span className="hidden sm:inline">Generate</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* My Questions Tab */}
          <TabsContent value="questions" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <BulkUploadDialog
                  onUpload={handleBulkUpload}
                  fullSubjects={fullSubjects}
                  fullTopics={fullTopics}
                  currentCount={stats?.total || 0}
                />
                <AddQuestionDialog 
                  onQuestionAdded={handleRefresh} 
                  currentCount={stats?.total || 0} 
                />
                <TelegramShareQuestionBank
                  selectedQuestionIds={selectedQuestionIds}
                  onClearSelection={handleClearSelection}
                />
              </div>
            </div>

            {/* Selection Controls */}
            {totalCount > 0 && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 bg-muted/30 rounded-lg border">
                {/* First Row: Select All + Range Selection */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-xs md:text-sm font-medium cursor-pointer whitespace-nowrap">
                      Select All ({filteredQuestions.length})
                    </label>
                  </div>

                  {/* Range Selection - Simplified on mobile */}
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
                      onClick={async () => {
                        const from = parseInt(rangeFrom) || 1;
                        const to = parseInt(rangeTo) || totalCount;

                        if (from < 1 || to < from || to > totalCount) {
                          toast({
                            title: "Invalid Range",
                            description: `Please enter valid range (1 to ${totalCount})`,
                            variant: "destructive",
                          });
                          return;
                        }

                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          // Fetch question IDs for the given range from database
                          const questionIds = await QuestionBankService.getQuestionIdsByRange(
                            user.id,
                            from,
                            to,
                            filters,
                            sortOrder
                          );

                          setSelectedQuestionIds(new Set(questionIds));
                          toast({
                            title: "Range Selected",
                            description: `Selected ${questionIds.length} questions (${from} to ${to})`,
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to select question range",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="h-7 md:h-8 text-xs md:text-sm font-medium px-2 md:px-3"
                    >
                      <span className="hidden sm:inline">Select</span> Go
                    </Button>
                  </div>
                </div>

                {/* Second Row: Selection Status + Actions */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <div className="text-xs md:text-sm text-muted-foreground">
                    {selectedQuestionIds.size > 0 ? (
                      <span className="font-medium text-primary">
                        {selectedQuestionIds.size} selected
                      </span>
                    ) : (
                      <span className="hidden md:inline">No questions selected</span>
                    )}
                  </div>
                  {selectedQuestionIds.size > 0 && (() => {
                    // Check if any selected question is a public question not owned by the current user
                    const selectedQuestionsList = Array.from(selectedQuestionIds).map(id => questions.find(q => q.id === id));
                    const hasUnownedPublicQuestion = selectedQuestionsList.some(q => q && q.is_public && q.user_id !== currentUserId);

                    // If user selected any public questions they don't own, don't show action buttons
                    if (hasUnownedPublicQuestion) {
                      return (
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Cannot modify selected public questions
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 md:h-8 gap-1 md:gap-2 text-xs md:text-sm bg-background/50 border-primary/20 hover:border-primary/50"
                          onClick={() => {
                            setBulkMoveSubject("");
                            setBulkMoveTopic("");
                            setIsBulkMoveDialogOpen(true);
                          }}
                          disabled={selectedQuestionIds.size === 0}
                        >
                          <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                          <span className="hidden sm:inline">Move</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 md:h-8 gap-1 md:gap-2 text-xs md:text-sm bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-700 dark:text-emerald-400"
                          onClick={() => handleBulkTogglePublic(true)}
                          disabled={selectedQuestionIds.size === 0}
                        >
                          <Globe className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Public</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 md:h-8 gap-1 md:gap-2 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border-slate-300 hover:border-slate-400 text-slate-600 dark:text-slate-400"
                          onClick={() => handleBulkTogglePublic(false)}
                          disabled={selectedQuestionIds.size === 0}
                        >
                          <Lock className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Private</span>
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowBulkDeleteDialog(true)}
                          className="h-7 md:h-8 gap-1 md:gap-2 text-xs md:text-sm font-bold"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    );
                  })()}


                </div>
              </div>
            )}


            {/* Filters */}
            <QuestionFilters
              filters={filters}
              onFiltersChange={setFilters}
              subjectsWithCounts={subjectsWithCounts}
              topicsWithCounts={topicsWithCounts}
              fullSubjects={fullSubjects}
              fullTopics={fullTopics}
              totalCount={totalCount}
              filteredCount={filteredQuestions.length}
              onAddSubject={handleAddSubject}
              onEditSubject={handleEditSubject}
              onDeleteSubject={handleDeleteSubject}
              onAddTopic={handleAddTopic}
              onEditTopic={handleEditTopic}
              onDeleteTopic={handleDeleteTopic}
              privateOnly={false}
            />

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 dark:border-emerald-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Globe className="w-4 h-4" />
                      Public
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">{stats.publicCount || 0}</div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Lock className="w-4 h-4" />
                      Private
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-600 dark:text-slate-400">{stats.privateCount || 0}</div>
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
              </div>
            )}


            {/* Questions List */}
            {loading ? (
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
                    {searchQuery ? "No matching questions" : "No questions found"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery
                      ? "Try adjusting your search or filters"
                      : "Add questions manually or import from quizzes and documents"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden bg-card">
                  {/* Table Header */}
                  <div className="grid grid-cols-[auto_auto_1fr_150px_130px] gap-4 p-4 bg-muted/50 border-b font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    <div className="w-6"></div>
                    <div className="w-10"></div>
                    <div>Question</div>
                    <div className="text-center">Subject/Topic</div>
                    <div className="text-center">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y">
                    {filteredQuestions.map((q, index) => (
                      <div
                        key={q.id}
                        className={`grid grid-cols-[auto_auto_1fr_150px_130px] gap-4 p-4 items-center hover:bg-muted/30 transition-colors ${selectedQuestionIds.has(q.id) ? "bg-primary/5" : ""
                          }`}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          id={`question-${q.id}`}
                          checked={selectedQuestionIds.has(q.id)}
                          onCheckedChange={() => handleToggleQuestion(q.id)}
                        />

                        {/* Q# */}
                        <div className="w-10 text-sm font-bold text-muted-foreground">
                          Q{sortOrder === 'asc'
                            ? (currentPage - 1) * pageSize + index + 1
                            : totalCount - ((currentPage - 1) * pageSize + index)}
                        </div>

                        {/* Question Text Only */}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground leading-relaxed line-clamp-2">
                            {q.question}
                          </p>
                        </div>

                        {/* Subject/Topic */}
                        <div className="text-center">
                          <ClassificationBadges
                            subject={q.subject}
                            topic={q.topic}
                            compact={true}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center gap-1">
                          {/* Show public indicator for all */}
                          {q.is_public && q.user_id !== currentUserId ? (
                            // For public questions not owned by user - show read-only indicator
                            <div className="h-8 px-2 flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">
                              <Globe className="w-3.5 h-3.5" />
                              <span className="font-medium">Public</span>
                            </div>
                          ) : q.user_id === currentUserId ? (
                            // For questions owned by current user - show all action buttons
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleTogglePublic(q)}
                                className={`h-8 w-8 ${q.is_public
                                  ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                title={q.is_public ? "Public (Click to make Private)" : "Private (Click to make Public)"}
                              >
                                {q.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(q)}
                                className="h-8 w-8 text-primary/70 hover:text-primary hover:bg-primary/10"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(q.id)}
                                className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>


                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 rounded-b-xl border-x border-b">
                    <div className="flex items-center gap-6">
                      <p className="text-sm text-muted-foreground font-semibold">
                        Showing <span className="text-foreground font-black">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-foreground font-black">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="text-foreground font-black">{totalCount}</span>
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Page Size:</span>
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(val) => {
                            setPageSize(parseInt(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[70px] h-8 font-bold border-2">
                            <SelectValue placeholder="20" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="30">30</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>


                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setCurrentPage(prev => Math.max(1, prev - 1));
                        }}
                        disabled={currentPage === 1 || loading}
                        className="gap-2 h-9 px-4 font-bold border-2 hover:bg-muted transition-all active:scale-95 shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </Button>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg border-2 text-sm font-black shadow-inner">
                        <span className="text-primary">{currentPage}</span>
                        <span className="text-muted-foreground/30 font-medium">/</span>
                        <span>{Math.ceil(totalCount / pageSize)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1));
                        }}
                        disabled={currentPage === Math.ceil(totalCount / pageSize) || loading}
                        className="gap-2 h-9 px-4 font-bold border-2 hover:bg-muted transition-all active:scale-95 shadow-sm"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>


          {/* AI Generate Tab */}
          <TabsContent value="ai-generate" className="space-y-6 mt-6">
            <AIQuestionGenerator
              currentCount={totalCount}
              onQuestionsGenerated={(questions, topic, difficulty, language) => {
                handleQuestionsGenerated(questions, topic, difficulty, language);
              }}
            />
            {/* Show AI generated questions with save option */}
            <AIGeneratedQuestionsList
              key={`ai-list-${aiListRefreshKey}`}
              sourceType="ai_generator"
              currentCount={totalCount}
              onQuestionsAdded={() => {
                loadQuestions();
                loadStats();
              }}
            />
          </TabsContent>

          {/* PDF Generate Tab */}
          <TabsContent value="pdf-generate" className="space-y-6 mt-6">
            <PDFQuestionGenerator
              currentCount={totalCount}
              onQuestionsGenerated={(questions, topic, difficulty, language) => {
                handleQuestionsGenerated(questions, topic, difficulty, language);
              }}
            />
            {/* Show PDF generated questions with save option */}
            <AIGeneratedQuestionsList
              key={`pdf-list-${aiListRefreshKey}`}
              sourceType="pdf_generator"
              currentCount={totalCount}
              onQuestionsAdded={() => {
                loadQuestions();
                loadStats();
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Question Selection Dialog */}
        <QuestionSelectionDialog
          open={showSelectionDialog}
          onOpenChange={setShowSelectionDialog}
          questions={generatedQuestions}
          defaultTopic={defaultTopic}
          defaultDifficulty={defaultDifficulty}
          defaultLanguage={defaultLanguage}
          onSaved={handleQuestionsSaved}
        />

        {/* Edit Question Dialog */}
        <EditQuestionDialog
          question={editingQuestion}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={handleRefresh}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteQuestionId !== null} onOpenChange={(open) => !open && setDeleteQuestionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Delete Question
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Are you sure you want to delete this question? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                Delete {selectedQuestionIds.size} Questions
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Are you sure you want to delete <span className="font-bold text-destructive">{selectedQuestionIds.size}</span> selected questions? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  handleBulkDelete();
                  setShowBulkDeleteDialog(false);
                }}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black"
              >
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Move Dialog */}
        <AlertDialog open={isBulkMoveDialogOpen} onOpenChange={setIsBulkMoveDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Move {selectedQuestionIds.size} Questions
              </AlertDialogTitle>
              <AlertDialogDescription>
                Select the target subject and topic for the selected questions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Subject</label>
                <Select value={bulkMoveSubject} onValueChange={setBulkMoveSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {fullSubjects.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Topic</label>
                <Select
                  value={bulkMoveTopic}
                  onValueChange={setBulkMoveTopic}
                  disabled={!bulkMoveSubject}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={bulkMoveSubject ? "Select Topic" : "Select Subject First"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO_TOPIC">Clear Topic / Optional</SelectItem>
                    {fullTopics
                      .filter(t => {
                        const subject = fullSubjects.find(s => s.name === bulkMoveSubject);
                        return subject && t.subject_id === subject.id;
                      })
                      .map(t => (
                        <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkMove}
                disabled={!bulkMoveSubject || isBulkMoving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black"
              >
                {isBulkMoving ? "Moving..." : "Move Questions"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
