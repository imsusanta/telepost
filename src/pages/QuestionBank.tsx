import { useState, useEffect, useCallback, useRef } from "react";
import { Database, Filter, RefreshCw, Search, Trash2, Sparkles, FileText, List, Zap, Download, Pencil, ChevronLeft, ChevronRight, ArrowDownAz, ArrowUpAz } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { QuestionBankService, QuestionBankItem, QuestionBankFilters } from "@/services/questionBankService";
import { ClassificationMetadataService } from "@/services/classificationMetadataService";
import { isSuperAdmin } from "@/services/couponService";
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
import { PDFQuestionGenerator } from "@/components/PDFQuestionGenerator";
import { QuestionSelectionDialog } from "@/components/QuestionSelectionDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { TelegramShareQuestionBank } from "@/components/TelegramShareQuestionBank";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { ParsedQuestion } from "@/utils/questionParser";
import { EditQuestionDialog } from "@/components/EditQuestionDialog";
import { ClassificationBadges } from "@/components/ClassificationBadges";
import { QuestionFilters } from "@/components/QuestionFilters";
import { ClassificationService } from "@/services/classificationService";
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
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(20);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  interface GeneratedQuestion {
    question: string;
    options: string[];
    correct_option_index: number;
    explanation?: string;
  }
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);
  const [defaultTopic, setDefaultTopic] = useState("");
  const [defaultDifficulty, setDefaultDifficulty] = useState("medium");
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
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [topicsWithCounts, setTopicsWithCounts] = useState<{ topic: string; count: number }[]>([]);
  const [isBulkMoveDialogOpen, setIsBulkMoveDialogOpen] = useState(false);
  const [bulkMoveSubject, setBulkMoveSubject] = useState("");
  const [bulkMoveTopic, setBulkMoveTopic] = useState("");
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const { toast } = useToast();

  const loadQuestions = useCallback(async (page = currentPage, query = searchQuery) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      const statistics = await QuestionBankService.getStatistics(user.id);
      setStats(statistics);
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

      // Check if any metadata calls failed due to missing tables
      const tableMissing = (allSubjectsRes.status === 'rejected' && (allSubjectsRes.reason?.message?.includes('PGRST116') || allSubjectsRes.reason?.message?.includes('not found') || allSubjectsRes.reason?.message?.includes('classification_subjects'))) ||
        (allTopicsRes.status === 'rejected' && (allTopicsRes.reason?.message?.includes('PGRST116') || allTopicsRes.reason?.message?.includes('not found') || allTopicsRes.reason?.message?.includes('classification_topics')));

      if (tableMissing) {
        console.warn("Classification tables missing. Please run database migrations.");
        toast({
          title: "Database Setup Required",
          description: "Classification tables are missing. Please run the SQL fix from database_fix.md in Supabase.",
          variant: "default",
        });
      }

      setSubjectsWithCounts(subjects);
      setFullSubjects(allSubjects);
      setFullTopics(allTopics);
      setTopicsWithCounts(topics.map(t => ({ topic: t, count: 0 })));
      const admin = await isSuperAdmin();
      setIsSuperUser(admin);
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
    try {
      await ClassificationMetadataService.createSubject(name);
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
    try {
      await ClassificationMetadataService.createTopic(subjectId, name);
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
    if (!bulkMoveSubject || !bulkMoveTopic || selectedQuestionIds.size === 0) return;

    try {
      setIsBulkMoving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await QuestionBankService.bulkUpdateClassification(
        Array.from(selectedQuestionIds),
        user.id,
        bulkMoveSubject,
        bulkMoveTopic
      );

      toast({
        title: "Success",
        description: `Successfully moved ${selectedQuestionIds.size} questions to ${bulkMoveSubject} > ${bulkMoveTopic}`,
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
  }, [currentPage, filters, loadStats, loadClassificationData]); // Specifically removed loadQuestions from here to avoid recursive triggers if not careful, but actually loadQuestions is memoized correctly. Let's keep it clean.

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

  const handleQuestionsGenerated = (generatedQs: GeneratedQuestion[], topic?: string, difficulty?: string, language?: string) => {
    setGeneratedQuestions(generatedQs);
    setDefaultTopic(topic || "");
    setDefaultDifficulty(difficulty || "medium");
    setDefaultLanguage(language || "en");
    setShowSelectionDialog(true);
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
        topic: "Bulk Upload",
        difficulty: "medium",
        language: "bn", // Default as per parser support for bilingual text
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


  const getSelectedQuestions = () => {
    return questions.filter(q => selectedQuestionIds.has(q.id));
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
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Database className="w-10 h-10" />
              Question Bank
            </h1>
            <p className="text-muted-foreground font-medium">
              Total Questions: <span className="text-foreground font-bold">{totalCount}</span>
              {searchQuery && <span className="ml-2">({totalCount} matching search)</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="gap-2 font-bold border-2 hover:bg-muted transition-all active:scale-95"
              title={sortOrder === 'desc' ? "Showing Newest First" : "Showing Oldest First"}
            >
              {sortOrder === 'desc' ? <ArrowDownAz className="w-4 h-4" /> : <ArrowUpAz className="w-4 h-4" />}
              {sortOrder === 'desc' ? "Newest" : "Oldest"}
            </Button>
            <Button variant="outline" onClick={handleExportQuestions} disabled={filteredQuestions.length === 0} className="gap-2 font-bold border-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="gap-2 font-bold border-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questions" className="gap-2">
              <List className="w-4 h-4" />
              My Questions
            </TabsTrigger>
            <TabsTrigger value="ai-generate" className="gap-2">
              <Zap className="w-4 h-4" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="pdf-generate" className="gap-2">
              <FileText className="w-4 h-4" />
              PDF Generate
            </TabsTrigger>
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
                <BulkUploadDialog onUpload={handleBulkUpload} />
                <AddQuestionDialog onQuestionAdded={handleRefresh} />
                <TelegramShareQuestionBank
                  selectedQuestions={getSelectedQuestions()}
                  onClearSelection={handleClearSelection}
                />
              </div>
            </div>

            {/* Selection Controls */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  {/* Range Selection */}
                  <span className="text-sm text-muted-foreground">Range:</span>
                  <Input
                    type="number"
                    placeholder="From"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                    className="w-16 h-8 text-sm"
                    min="1"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="number"
                    placeholder="To"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                    className="w-16 h-8 text-sm"
                    min="1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const from = parseInt(rangeFrom) || 1;
                      const to = parseInt(rangeTo) || filteredQuestions.length;
                      if (from > 0 && to >= from && to <= filteredQuestions.length) {
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
                          description: `Please enter valid range (1 to ${filteredQuestions.length})`,
                          variant: "destructive",
                        });
                      }
                    }}
                    className="h-8 text-sm font-medium"
                  >
                    Select Range
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {selectedQuestionIds.size > 0 ? (
                      <span className="font-medium text-primary">
                        {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} selected
                      </span>
                    ) : (
                      <span>No questions selected</span>
                    )}
                  </div>
                  {selectedQuestionIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 bg-background/50 border-primary/20 hover:border-primary/50"
                        onClick={() => {
                          setBulkMoveSubject("");
                          setBulkMoveTopic("");
                          setIsBulkMoveDialogOpen(true);
                        }}
                        disabled={selectedQuestionIds.size === 0}
                      >
                        <Sparkles className="w-4 h-4 text-primary" />
                        Move Category
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        className="gap-2 font-bold"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </Button>
                    </div>
                  )}
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
              totalCount={totalCount}
              filteredCount={filteredQuestions.length}
              onAddSubject={isSuperUser ? handleAddSubject : undefined}
              onEditSubject={isSuperUser ? handleEditSubject : undefined}
              onDeleteSubject={isSuperUser ? handleDeleteSubject : undefined}
              onAddTopic={isSuperUser ? handleAddTopic : undefined}
              onEditTopic={isSuperUser ? handleEditTopic : undefined}
              onDeleteTopic={isSuperUser ? handleDeleteTopic : undefined}
            />

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
                  <div className="grid grid-cols-[auto_auto_1fr_150px_100px] gap-4 p-4 bg-muted/50 border-b font-semibold text-sm text-muted-foreground uppercase tracking-wider">
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
                        className={`grid grid-cols-[auto_auto_1fr_150px_100px] gap-4 p-4 items-center hover:bg-muted/30 transition-colors ${selectedQuestionIds.has(q.id) ? "bg-primary/5" : ""
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
                            difficulty={q.difficulty}
                            compact={true}
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center gap-1">
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

                      <div className="hidden md:flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Page Size:</span>
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(val) => {
                            setPageSize(parseInt(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[70px] font-bold border-2 bg-background">
                            <SelectValue placeholder="20" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20" className="font-medium">20</SelectItem>
                            <SelectItem value="30" className="font-medium">30</SelectItem>
                            <SelectItem value="50" className="font-medium">50</SelectItem>
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
              onQuestionsGenerated={(questions) => handleQuestionsGenerated(questions)}
            />
          </TabsContent>

          {/* PDF Generate Tab */}
          <TabsContent value="pdf-generate" className="space-y-6 mt-6">
            <PDFQuestionGenerator
              onQuestionsGenerated={(questions) => handleQuestionsGenerated(questions)}
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
          <AlertDialogContent className="clay-card border-none">
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
          <AlertDialogContent className="clay-card border-none">
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
          <AlertDialogContent className="clay-card border-none max-w-md">
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
                    {topicsWithCounts.map(t => (
                      <SelectItem key={t.topic} value={t.topic}>{t.topic}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkMove}
                disabled={!bulkMoveSubject || !bulkMoveTopic || isBulkMoving}
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
