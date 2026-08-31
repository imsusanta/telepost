import { useState, useEffect, useCallback } from "react";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import type { QuizConfig } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeBaseTopic, KnowledgeBaseTopicService } from "@/services/knowledgeBaseTopicService";

interface QuizConfigProps { onStartQuiz: (config: QuizConfig) => void; isGenerating: boolean; maxQuestions?: number }

export const QuizConfigForm = ({ onStartQuiz, isGenerating, maxQuestions = 50 }: QuizConfigProps) => {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [customQuestionCount, setCustomQuestionCount] = useState("");
  const [language, setLanguage] = useState<"bn" | "en" | "hi">("en");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [knowledgeTopics, setKnowledgeTopics] = useState<KnowledgeBaseTopic[]>([]);
  const [selectedKnowledgeTopicId, setSelectedKnowledgeTopicId] = useState("");
  const [knowledgeTopicsLoading, setKnowledgeTopicsLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const { toast } = useToast();

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setChannels(await ChannelService.getUserChannels(user.id));
    } catch (error) {
      toast({ title: "Error", description: "Failed to load channels", variant: "destructive" });
    } finally { setChannelsLoading(false); }
  }, [toast]);

  const loadKnowledgeTopics = useCallback(async () => {
    setKnowledgeTopicsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const topics = await KnowledgeBaseTopicService.list(user.id, selectedChannel || "all");
      setKnowledgeTopics(topics);
    } catch (error) {
      console.error("Failed to load knowledge topics:", error);
      setKnowledgeTopics([]);
    } finally { setKnowledgeTopicsLoading(false); }
  }, [selectedChannel]);

  useEffect(() => { loadChannels(); }, [loadChannels]);
  useEffect(() => { loadKnowledgeTopics(); }, [loadKnowledgeTopics]);

  useEffect(() => {
    if (!selectedChannel) return;
    const channel = channels.find((c) => c.id === selectedChannel);
    if (channel?.settings) {
      if (channel.settings.default_subject) setTopic(channel.settings.default_subject);
      if (channel.settings.default_language) setLanguage(channel.settings.default_language);
      if (channel.settings.system_prompt) setSystemPrompt(channel.settings.system_prompt);
      if (channel.settings.questions_per_quiz) {
        const count = channel.settings.questions_per_quiz.toString();
        if (["3", "5", "10", "15"].includes(count)) setQuestionCount(count);
        else { setQuestionCount("custom"); setCustomQuestionCount(count); }
      }
    }
  }, [selectedChannel, channels]);

  useEffect(() => {
    if (!selectedKnowledgeTopicId) return;
    const selected = knowledgeTopics.find((item) => item.id === selectedKnowledgeTopicId);
    if (!selected) return;
    setTopic(selected.topic);
    if (selected.language === "bn" || selected.language === "en" || selected.language === "hi") setLanguage(selected.language);
    const context = [selected.description, selected.prompt_context].filter(Boolean).join("\n\n");
    if (context) setSystemPrompt(context);
  }, [selectedKnowledgeTopicId, knowledgeTopics]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const actualQuestionCount = questionCount === "custom" ? parseInt(customQuestionCount) : parseInt(questionCount);
    if (!actualQuestionCount || actualQuestionCount < 1 || actualQuestionCount > maxQuestions) {
      toast({ title: "Invalid Range", description: `Number of questions must be between 1 and ${maxQuestions}`, variant: "destructive" });
      return;
    }
    const config: QuizConfig = {
      topic: topic.trim(),
      questionCount: actualQuestionCount,
      language,
      systemPrompt: systemPrompt.trim() || undefined,
      channelId: selectedChannel || undefined,
      knowledgeBaseTopicIds: selectedKnowledgeTopicId ? [selectedKnowledgeTopicId] : undefined,
    };
    onStartQuiz(config);
  };

  return <Card className="w-full max-w-2xl p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all">
    <div className="mb-8 text-center"><div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-primary to-primary/80"><Sparkles className="w-8 h-8 text-primary-foreground" /></div><h2 className="text-3xl font-bold text-foreground mb-2">Create Your Quiz</h2><p className="text-muted-foreground">Generate AI-powered quizzes from any topic or your Knowledge Base.</p></div>
    <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-1"><div className="font-semibold text-foreground flex items-center gap-1.5 text-sm"><span>🎯</span><span>Government Exam Standard</span></div><p className="text-muted-foreground leading-relaxed">Every quiz follows TelePost's standard competitive-exam question format.</p></div>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2"><Label htmlFor="channel">Channel (Optional)</Label><Select value={selectedChannel} onValueChange={(value) => { setSelectedChannel(value); setSelectedKnowledgeTopicId(""); }} disabled={channelsLoading}><SelectTrigger id="channel" className="h-12">{channelsLoading ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading channels...</span> : <SelectValue placeholder={channels.length === 0 ? "No channels available" : "Select a channel"} />}</SelectTrigger><SelectContent>{channels.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No channels found. You can still generate a quiz without a channel.</div> : channels.map((channel) => <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="knowledge-topic">Knowledge Base Topic (Optional)</Label><Select value={selectedKnowledgeTopicId} onValueChange={setSelectedKnowledgeTopicId} disabled={knowledgeTopicsLoading}><SelectTrigger id="knowledge-topic" className="h-12"><SelectValue placeholder={knowledgeTopicsLoading ? "Loading topics..." : knowledgeTopics.length === 0 ? "No saved topics" : "Select a saved topic"} /></SelectTrigger><SelectContent>{knowledgeTopics.map((item) => <SelectItem key={item.id} value={item.id}>{item.subject ? `${item.subject} — ${item.topic}` : item.topic}</SelectItem>)}</SelectContent></Select>{selectedKnowledgeTopicId && <p className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" />AI will use this saved topic and context when generating questions.</p>}</div>
      <div className="space-y-2"><Label htmlFor="topic">Quiz Topic</Label><Input id="topic" placeholder="e.g., Indian Polity, Physics, Biology..." value={topic} onChange={(e) => setTopic(e.target.value)} required className="h-12" /></div>
      <div className="space-y-2"><Label htmlFor="language">Language</Label><Select value={language} onValueChange={(v) => setLanguage(v as "bn" | "en" | "hi")}><SelectTrigger id="language" className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bn">Bengali (বাংলা)</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi (हिन्दী)</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="systemPrompt">Custom Instructions (Optional)</Label><textarea id="systemPrompt" placeholder="Exam focus, scope, important facts, exclusions..." value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full h-24 px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none text-foreground placeholder:text-muted-foreground" /></div>
      <div className="space-y-2"><Label htmlFor="count">Number of Questions</Label><Select value={questionCount} onValueChange={setQuestionCount}><SelectTrigger id="count" className="h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 Questions</SelectItem><SelectItem value="5">5 Questions</SelectItem><SelectItem value="10">10 Questions</SelectItem><SelectItem value="15">15 Questions</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select>{questionCount === "custom" && <Input type="number" placeholder={`Enter number (1-${maxQuestions})`} value={customQuestionCount} onChange={(e) => setCustomQuestionCount(e.target.value)} min="1" max={maxQuestions} className="h-12 mt-2" />}</div>
      <Button type="submit" disabled={!topic.trim() || isGenerating} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90">{isGenerating ? <><Sparkles className="w-5 h-5 mr-2 animate-spin" />Generating Quiz...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate Quiz</>}</Button>
    </form>
  </Card>;
};
