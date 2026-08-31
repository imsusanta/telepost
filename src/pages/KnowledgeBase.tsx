import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeBaseTopic, KnowledgeBaseTopicService } from "@/services/knowledgeBaseTopicService";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import { supabase } from "@/integrations/supabase/client";

export default function KnowledgeBase() {
  const [topics, setTopics] = useState<KnowledgeBaseTopic[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<KnowledgeBaseTopic | null>(null);
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [context, setContext] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setTopics(await KnowledgeBaseTopicService.list(user.id, channelId));
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load knowledge base", variant: "destructive" });
    } finally { setLoading(false); }
  }, [channelId, toast]);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setChannels(await ChannelService.getUserChannels(user.id));
      } catch (error) {
        console.error("Failed to load channels", error);
      }
    })();
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) => [t.topic, t.subject, t.description, t.prompt_context].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [topics, search]);

  const reset = () => { setEditing(null); setTopic(""); setSubject(""); setDescription(""); setLanguage("bn"); setContext(""); };

  const save = async () => {
    if (!topic.trim()) return toast({ title: "Topic required", description: "Enter a topic name.", variant: "destructive" });
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const payload = { topic, subject, description, language, prompt_context: context, channel_id: channelId === "all" ? null : channelId };
      if (editing) await KnowledgeBaseTopicService.update(user.id, editing.id, payload);
      else await KnowledgeBaseTopicService.create(user.id, payload);
      toast({ title: editing ? "Topic updated" : "Topic added", description: "Ready for AI question generation." });
      reset();
      await load();
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Failed to save topic", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const edit = (item: KnowledgeBaseTopic) => {
    setEditing(item); setTopic(item.topic); setSubject(item.subject || ""); setDescription(item.description || ""); setLanguage(item.language || "bn"); setContext(item.prompt_context || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (item: KnowledgeBaseTopic) => {
    if (!window.confirm(`Delete topic "${item.topic}"?`)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await KnowledgeBaseTopicService.remove(user.id, item.id);
      toast({ title: "Deleted", description: "Topic removed from Knowledge Base." });
      await load();
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Failed to delete topic", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-primary/10 text-primary"><BookOpen className="w-8 h-8" /></div><h1 className="text-4xl font-extrabold tracking-tight">Knowledge Base</h1></div><p className="text-muted-foreground text-lg mt-2">Save topics and context for reusable AI question generation.</p></div>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard/create-quiz")}><Plus className="mr-2 h-4 w-4" /> Generate Quiz</Button>
        </div>

        <Card className="rounded-2xl border-none shadow-sm"><CardHeader><CardTitle>{editing ? "Edit Topic" : "Add Topic"}</CardTitle><CardDescription>Knowledge Base is topic-based. PDF upload is intentionally removed.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Topic *</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Indian Polity – Fundamental Rights" /></div>
          <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. General Knowledge" /></div>
          <div className="space-y-2"><Label>Channel</Label><Select value={channelId} onValueChange={setChannelId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Global Knowledge Base</SelectItem>{channels.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Language</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bn">Bengali</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent></Select></div>
          <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should this topic cover?" /></div>
          <div className="space-y-2 md:col-span-2"><Label>AI Context / Instructions</Label><Textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Exam focus, important facts, scope, exclusions, preferred terminology..." /></div>
          <div className="flex gap-2 md:col-span-2"><Button onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Update Topic" : "Add Topic"}</Button>{editing && <Button variant="outline" onClick={reset}>Cancel</Button>}</div>
        </CardContent></Card>

        <div className="flex gap-3 flex-wrap"><div className="relative flex-1 min-w-[240px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-10 h-11 rounded-xl" placeholder="Search topics..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="min-w-[220px]"><Select value={channelId} onValueChange={setChannelId}><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Filter by channel" /></SelectTrigger><SelectContent><SelectItem value="all">All / Global</SelectItem>{channels.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div></div>

        {loading ? <div className="py-16 text-center text-muted-foreground">Loading topics...</div> : filtered.length === 0 ? <div className="py-20 text-center rounded-3xl border-2 border-dashed border-muted/50 bg-muted/5"><BookOpen className="w-14 h-14 mx-auto text-muted-foreground/40" /><h3 className="text-2xl font-bold mt-4">No topics yet</h3><p className="text-muted-foreground max-w-md mx-auto mt-2">Add your subjects and topics here. TelePost will use them as reusable context for AI question generation.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map((item) => <Card key={item.id} className="rounded-2xl border-none shadow-sm"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{item.topic}</CardTitle><CardDescription>{item.subject || "General"}</CardDescription></div><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => edit(item)}><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => remove(item)}><Trash2 className="w-4 h-4" /></Button></div></div></CardHeader><CardContent className="space-y-4">{item.description && <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>}{item.prompt_context && <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground line-clamp-3">AI context: {item.prompt_context}</div>}<Button className="w-full" variant="outline" onClick={() => navigate(`/dashboard/create-quiz?topic=${encodeURIComponent(item.topic)}`)}>✨ Generate Questions</Button></CardContent></Card>)}</div>}
      </div>
    </DashboardLayout>
  );
}
