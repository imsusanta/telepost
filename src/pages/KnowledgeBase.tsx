import { useState, useEffect, useCallback, useMemo } from "react";
import { BookOpen, Search, Plus, Edit2, Trash2, Filter, Loader2, Save, RotateCcw, Brain } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KnowledgeBaseTopic } from "@/types/knowledgeBase";
import { KnowledgeBaseService } from "@/services/knowledgeBaseService";
import { KnowledgeBaseTopicDialog } from "@/components/KnowledgeBaseTopicDialog";
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

export default function KnowledgeBase() {
  const [topics, setTopics] = useState<KnowledgeBaseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<KnowledgeBaseTopic | null>(null);
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<KnowledgeBaseTopic | null>(null);
  
  // System Prompt state
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptSaving, setPromptSaving] = useState(false);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await KnowledgeBaseService.getTopics();
      setTopics(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load topics");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSystemPrompt = useCallback(async () => {
    setPromptLoading(true);
    try {
      const prompt = await KnowledgeBaseService.getUserSystemPrompt();
      setSystemPrompt(prompt || "");
    } catch (error: any) {
      toast.error(error.message || "Failed to load system prompt");
    } finally {
      setPromptLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
    loadSystemPrompt();
  }, [loadTopics, loadSystemPrompt]);

  const handleSavePrompt = async () => {
    if (systemPrompt.length > KnowledgeBaseService.MAX_SYSTEM_PROMPT_LENGTH) {
      toast.error(`System Prompt cannot exceed ${KnowledgeBaseService.MAX_SYSTEM_PROMPT_LENGTH.toLocaleString()} characters`);
      return;
    }
    setPromptSaving(true);
    try {
      await KnowledgeBaseService.saveUserSystemPrompt(systemPrompt);
      toast.success("System prompt saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save system prompt");
    } finally {
      setPromptSaving(false);
    }
  };

  const handleClearPrompt = () => {
    setSystemPrompt("");
  };

  const handleEdit = (topic: KnowledgeBaseTopic) => {
    setEditingTopic(topic);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTopic(null);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!topicToDelete) return;
    try {
      await KnowledgeBaseService.deleteTopic(topicToDelete.id);
      toast.success("Topic deleted successfully");
      loadTopics();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete topic");
    } finally {
      setDeleteDialogOpen(false);
      setTopicToDelete(null);
    }
  };

  const subjects = useMemo(() => {
    const subs = new Set(topics.map(t => t.subject).filter(Boolean) as string[]);
    return Array.from(subs);
  }, [topics]);

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (topic.subject && topic.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === "all" || topic.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const getLanguageLabel = (code?: string) => {
    if (code === "bn" || code === "Bengali") return "বাংলা";
    if (code === "hi" || code === "Hindi") return "हिन्दी";
    return "English";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Brain className="w-8 h-8" />
              </div>
              Knowledge Base
            </h1>
            <p className="text-muted-foreground text-lg ml-1">
              Manage topics, instructions, and rules for AI generation
            </p>
          </div>
          <Button onClick={handleAdd} className="gap-2 h-11 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-5 h-5" />
            Add Topic
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-none bg-muted/30 shadow-none px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-none shadow-sm rounded-xl focus-visible:ring-primary/20 bg-background"
              />
            </div>
            <div className="w-full sm:w-[250px]">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-11 border-none shadow-sm rounded-xl focus-visible:ring-primary/20 bg-background">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="All Subjects" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Topics Grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-[200px] animate-pulse border-none bg-muted/20" />
              ))}
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-3xl border-2 border-dashed border-muted/50 bg-muted/5">
              <div className="p-6 rounded-full bg-muted/50 text-muted-foreground mb-4">
                <BookOpen className="w-16 h-16" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight">No topics found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {searchQuery ? "Try adjusting your search or filters." : "Create your first topic to structure your AI knowledge base."}
              </p>
              {!searchQuery && (
                <Button onClick={handleAdd} className="mt-4 gap-2 rounded-xl">
                  <Plus className="w-4 h-4" /> Add Topic
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTopics.map((topic) => (
                <Card key={topic.id} className="group flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-none shadow-sm bg-card ring-1 ring-border/50">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                        {topic.topic_name}
                      </CardTitle>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg" onClick={() => handleEdit(topic)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-lg" onClick={() => { setTopicToDelete(topic); setDeleteDialogOpen(true); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {topic.subject && <Badge variant="secondary" className="font-medium bg-secondary/50">{topic.subject}</Badge>}
                      <Badge variant="outline" className="font-medium text-muted-foreground">{getLanguageLabel(topic.language)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pb-4">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {topic.description || "No description provided."}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 text-xs text-muted-foreground border-t border-border/10 mt-auto pt-4 flex justify-between">
                    <span>{topic.exam ? `Exam: ${topic.exam}` : (topic.grade ? `Level: ${topic.grade}` : "")}</span>
                    <span>{topic.updated_at ? new Date(topic.updated_at).toLocaleDateString() : ""}</span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* System Prompt Section */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 ring-1 ring-border/50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              System Prompt
            </CardTitle>
            <CardDescription className="text-base">
              Instructions that TelePost AI should follow when generating quizzes and posts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {promptLoading ? (
              <div className="h-40 flex items-center justify-center bg-muted/20 rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
              <Textarea
                aria-label="System Prompt"
                placeholder="Enter base instructions for the AI... e.g. Always explain the answers in simple terms. Avoid complicated jargon."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                maxLength={KnowledgeBaseService.MAX_SYSTEM_PROMPT_LENGTH}
                className="min-h-[200px] resize-y rounded-xl p-4 text-base focus-visible:ring-primary/20"
              />
              <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>Do not include passwords, API keys, or other secrets.</span>
                <span>{systemPrompt.length.toLocaleString()} / {KnowledgeBaseService.MAX_SYSTEM_PROMPT_LENGTH.toLocaleString()}</span>
              </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3 pb-6">
            <Button variant="outline" onClick={handleClearPrompt} className="gap-2 rounded-xl h-11 px-6">
              <RotateCcw className="w-4 h-4" />
              Clear
            </Button>
            <Button onClick={handleSavePrompt} disabled={promptSaving || promptLoading} className="gap-2 rounded-xl h-11 px-8 shadow-md">
              {promptSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </Button>
          </CardFooter>
        </Card>
      </div>

      <KnowledgeBaseTopicDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        topic={editingTopic}
        onSaved={loadTopics}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{topicToDelete?.topic_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
