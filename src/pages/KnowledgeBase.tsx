import { useState, useEffect, useCallback } from "react";
import { BookOpen, Search, Plus, Edit2, Trash2, Loader2, Save, RotateCcw, Brain, MoreHorizontal } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KnowledgeBaseTopic } from "@/types/knowledgeBase";
import { KnowledgeBaseService } from "@/services/knowledgeBaseService";
import { KnowledgeBaseTopicDialog } from "@/components/KnowledgeBaseTopicDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function KnowledgeBase() {
  const [topics, setTopics] = useState<KnowledgeBaseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<KnowledgeBaseTopic | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<KnowledgeBaseTopic | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(true);
  const [promptSaving, setPromptSaving] = useState(false);

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try { setTopics(await KnowledgeBaseService.getTopics()); }
    catch (error: any) { toast.error(error.message || "Failed to load topics"); }
    finally { setLoading(false); }
  }, []);

  const loadSystemPrompt = useCallback(async () => {
    setPromptLoading(true);
    try { setSystemPrompt((await KnowledgeBaseService.getUserSystemPrompt()) || ""); }
    catch (error: any) { toast.error(error.message || "Failed to load system prompt"); }
    finally { setPromptLoading(false); }
  }, []);

  useEffect(() => { loadTopics(); loadSystemPrompt(); }, [loadTopics, loadSystemPrompt]);

  const handleSavePrompt = async () => {
    if (systemPrompt.length > KnowledgeBaseService.MAX_SYSTEM_PROMPT_LENGTH) {
      toast.error(`System Prompt cannot exceed ${KnowledgeBaseService.MAX_SYSTEM_PROMPT_LENGTH.toLocaleString()} characters`);
      return;
    }
    setPromptSaving(true);
    try {
      await KnowledgeBaseService.saveUserSystemPrompt(systemPrompt);
      toast.success("System prompt saved successfully");
    } catch (error: any) { toast.error(error.message || "Failed to save system prompt"); }
    finally { setPromptSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!topicToDelete) return;
    try {
      await KnowledgeBaseService.deleteTopic(topicToDelete.id);
      toast.success("Topic deleted successfully");
      await loadTopics();
    } catch (error: any) { toast.error(error.message || "Failed to delete topic"); }
    finally { setDeleteDialogOpen(false); setTopicToDelete(null); }
  };

  const filteredTopics = topics.filter((topic) =>
    topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <DashboardLayout>
      <div className="space-y-7 pb-12 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Brain className="w-7 h-7" /></div>
              <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
            </div>
            <p className="mt-1 text-muted-foreground">Manage topics that TelePost AI can use for quiz and post generation.</p>
          </div>
          <Button onClick={() => { setEditingTopic(null); setDialogOpen(true); }} className="gap-2 rounded-xl h-11 px-5">
            <Plus className="w-5 h-5" /> Add Topics
          </Button>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border shadow-sm">
          <CardHeader className="border-b bg-muted/20 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Topics</CardTitle>
                <CardDescription>{filteredTopics.length} topic{filteredTopics.length === 1 ? "" : "s"}</CardDescription>
              </div>
              <Badge variant="secondary">Topic Library</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
            ) : filteredTopics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="p-4 rounded-full bg-muted/50 mb-4"><BookOpen className="w-10 h-10 text-muted-foreground" /></div>
                <h3 className="text-xl font-semibold">No topics found</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                  {searchQuery ? "Try a different search term." : "Add topics that you want TelePost AI to use for content generation."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredTopics.map((topic, index) => (
                  <div key={topic.id} className="grid grid-cols-[56px_minmax(0,1fr)_110px_110px] md:grid-cols-[72px_minmax(0,1fr)_120px_120px] items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="text-sm text-muted-foreground tabular-nums">{index + 1}</div>
                    <div className="min-w-0">
                      <div className="font-medium text-base truncate">{topic.topic_name}</div>
                    </div>
                    <div>
                      <Badge variant="outline" className="font-normal">{topic.language === "bn" ? "বাংলা" : topic.language === "hi" ? "हिन्दी" : "English"}</Badge>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTopic(topic); setDialogOpen(true); }} aria-label={`Edit ${topic.topic_name}`}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setTopicToDelete(topic); setDeleteDialogOpen(true); }} aria-label={`Delete ${topic.topic_name}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t bg-muted/10 px-5 py-3 text-sm text-muted-foreground">
            {topics.length > 0 ? `Showing ${filteredTopics.length} of ${topics.length} topics` : "No topics yet"}
          </CardFooter>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> System Prompt</CardTitle>
            <CardDescription>Global instructions TelePost AI follows when generating quizzes and posts.</CardDescription>
          </CardHeader>
          <CardContent>
            {promptLoading ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div> : (
              <Textarea
                aria-label="System Prompt"
                placeholder="Example: Always write in simple Bengali, keep questions exam-focused, avoid duplicates..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                maxLength={KnowledgeBaseService.MAX_SYSTEM_PROMPT_LENGTH}
                className="min-h-[180px] rounded-xl resize-y"
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t">
            <Button variant="outline" onClick={() => setSystemPrompt("")} disabled={promptSaving} className="gap-2"><RotateCcw className="w-4 h-4" /> Clear</Button>
            <Button onClick={handleSavePrompt} disabled={promptLoading || promptSaving} className="gap-2"><Save className="w-4 h-4" /> Save Settings</Button>
          </CardFooter>
        </Card>
      </div>

      <KnowledgeBaseTopicDialog open={dialogOpen} onOpenChange={setDialogOpen} topic={editingTopic} onSaved={loadTopics} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{topicToDelete?.topic_name}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
