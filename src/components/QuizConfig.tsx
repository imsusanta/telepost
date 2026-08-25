import { useState, useEffect, useCallback } from "react";
import { Database, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import type { QuizConfig } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";

interface QuizConfigProps {
  onStartQuiz: (config: QuizConfig) => void;
  isGenerating: boolean;
  maxQuestions?: number;
}

export const QuizConfigForm = ({ onStartQuiz, isGenerating, maxQuestions = 50 }: QuizConfigProps) => {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [customQuestionCount, setCustomQuestionCount] = useState("");
  const [language, setLanguage] = useState<"bn" | "en" | "hi">("bn");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [useChannelKnowledgeBase, setUseChannelKnowledgeBase] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const { toast } = useToast();

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChannelsLoading(false);
        return;
      }

      const userChannels = await ChannelService.getUserChannels(user.id);
      setChannels(userChannels);
    } catch (error) {
      console.error("Failed to load channels:", error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    } finally {
      setChannelsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    // Auto-fill settings from selected channel safely
    if (selectedChannel) {
      const channel = channels.find((c) => c.id === selectedChannel);
      let s: any = channel?.settings;
      if (typeof s === "string") {
        try {
          s = JSON.parse(s);
        } catch {
          s = undefined;
        }
      }
      if (s && typeof s === "object") {
        if (s.default_subject && typeof s.default_subject === "string") {
          setTopic(s.default_subject);
        }
        if (s.default_language && typeof s.default_language === "string") {
          const lang = s.default_language.toLowerCase().trim();
          if (lang === "bn" || lang === "bengali" || lang === "bangla") setLanguage("bn");
          else if (lang === "en" || lang === "english") setLanguage("en");
          else if (lang === "hi" || lang === "hindi") setLanguage("hi");
          else setLanguage("bn");
        }
        if (s.system_prompt && typeof s.system_prompt === "string") {
          setSystemPrompt(s.system_prompt);
        }
        if (s.questions_per_quiz !== undefined && s.questions_per_quiz !== null) {
          const num = Number(s.questions_per_quiz);
          if (!isNaN(num) && num > 0) {
            const countStr = num.toString();
            if (["3", "5", "10", "15"].includes(countStr)) {
              setQuestionCount(countStr);
            } else {
              setQuestionCount("custom");
              setCustomQuestionCount(countStr);
            }
          }
        }
      }
    }
  }, [selectedChannel, channels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const actualQuestionCount = questionCount === "custom"
      ? parseInt(customQuestionCount)
      : parseInt(questionCount);

    if (questionCount === "custom") {
      if (!customQuestionCount || isNaN(actualQuestionCount)) {
        toast({ title: "Invalid Input", description: "Please enter a valid number of questions", variant: "destructive" });
        return;
      }
      if (actualQuestionCount < 1 || actualQuestionCount > maxQuestions) {
        toast({ title: "Invalid Range", description: `Number of questions must be between 1 and ${maxQuestions}`, variant: "destructive" });
        return;
      }
    } else if (actualQuestionCount > maxQuestions) {
      toast({ title: "Limit Exceeded", description: `Your plan allows maximum ${maxQuestions} questions per quiz.`, variant: "destructive" });
      return;
    }

    onStartQuiz({
      topic: topic.trim(),
      questionCount: actualQuestionCount,
      language,
      systemPrompt: systemPrompt.trim() || undefined,
      channelId: selectedChannel || undefined,
      useChannelKnowledgeBase: useChannelKnowledgeBase && !!selectedChannel,
    });
  };

  return (
    <Card className="w-full max-w-2xl p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-primary to-primary/80">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Create Your Quiz</h2>
        <p className="text-muted-foreground">Generate AI-powered quizzes on any topic</p>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-1">
        <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
          <span>🎯</span>
          <span>Government Exam Standard</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Every quiz is automatically generated following the standard and style of competitive government examinations. No manual difficulty selection is required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="channel" className="text-sm font-medium">Channel (Optional)</Label>
          <Select value={selectedChannel || undefined} onValueChange={(val) => setSelectedChannel(val === "none" ? "" : val)} disabled={channelsLoading}>
            <SelectTrigger id="channel" className="h-12">
              {channelsLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading channels...</span>
              ) : (
                <SelectValue placeholder={channels.length === 0 ? "No channels available" : "Select a channel"} />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No channel (Default)</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name || "Unnamed Channel"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedChannel && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="use-knowledge-base" className="text-sm font-medium cursor-pointer">Use Channel Knowledge Base</Label>
                <p className="text-xs text-muted-foreground">Generate questions from channel documents</p>
              </div>
            </div>
            <Switch id="use-knowledge-base" checked={useChannelKnowledgeBase} onCheckedChange={setUseChannelKnowledgeBase} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-medium">Quiz Topic</Label>
          <Input id="topic" placeholder="e.g., World History, JavaScript, Biology..." value={topic} onChange={(e) => setTopic(e.target.value)} required className="h-12" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm font-medium">Language</Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as "bn" | "en" | "hi")}>
            <SelectTrigger id="language" className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">Bengali (বাংলা)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="systemPrompt" className="text-sm font-medium">Custom Instructions (Optional)</Label>
          <textarea id="systemPrompt" placeholder="Add custom instructions for quiz generation... e.g., Focus on practical examples, Include real-world scenarios, Make it beginner-friendly, etc." value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full h-24 px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none text-foreground placeholder:text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="count" className="text-sm font-medium">Number of Questions</Label>
          <Select value={questionCount} onValueChange={setQuestionCount}>
            <SelectTrigger id="count" className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Questions</SelectItem>
              <SelectItem value="5">5 Questions</SelectItem>
              <SelectItem value="10">10 Questions</SelectItem>
              <SelectItem value="15">15 Questions</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {questionCount === "custom" && <Input type="number" placeholder={`Enter number (1-${maxQuestions})`} value={customQuestionCount} onChange={(e) => setCustomQuestionCount(e.target.value)} min="1" max={maxQuestions} className="h-12 mt-2" />}
        </div>

        <Button type="submit" disabled={!topic.trim() || isGenerating} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all">
          {isGenerating ? <><Sparkles className="w-5 h-5 mr-2 animate-spin" />Generating Quiz...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate Quiz</>}
        </Button>
      </form>
    </Card>
  );
};