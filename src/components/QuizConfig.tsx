import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Database, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import type { QuizConfig } from "@/types/quiz";
import { useToast } from "@/hooks/use-toast";

interface QuizConfigProps {
  onStartQuiz: (config: QuizConfig) => void;
  isGenerating: boolean;
}

export const QuizConfigForm = ({ onStartQuiz, isGenerating }: QuizConfigProps) => {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [language, setLanguage] = useState<"bn" | "en" | "hi">("en");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [useChannelKnowledgeBase, setUseChannelKnowledgeBase] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    // Auto-fill settings from selected channel
    if (selectedChannel) {
      const channel = channels.find((c) => c.id === selectedChannel);
      if (channel?.settings) {
        if (channel.settings.default_subject) {
          setTopic(channel.settings.default_subject);
        }
        if (channel.settings.default_difficulty) {
          setDifficulty(channel.settings.default_difficulty);
        }
        if (channel.settings.default_language) {
          setLanguage(channel.settings.default_language);
        }
        if (channel.settings.system_prompt) {
          setSystemPrompt(channel.settings.system_prompt);
        }
        if (channel.settings.questions_per_quiz) {
          setQuestionCount(channel.settings.questions_per_quiz.toString());
        }
      }
    }
  }, [selectedChannel, channels]);

  const loadChannels = async () => {
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStartQuiz({
        topic: topic.trim(),
        questionCount: parseInt(questionCount),
        difficulty,
        language,
        systemPrompt: systemPrompt.trim() || undefined,
        channelId: selectedChannel || undefined,
        useChannelKnowledgeBase: useChannelKnowledgeBase && !!selectedChannel,
      });
    }
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="channel" className="text-sm font-medium">
            Channel (Optional)
          </Label>
          <Select value={selectedChannel} onValueChange={setSelectedChannel} disabled={channelsLoading}>
            <SelectTrigger id="channel" className="h-12">
              {channelsLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading channels...
                </span>
              ) : (
                <SelectValue placeholder={channels.length === 0 ? "No channels available" : "Select a channel"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {channels.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No channels found. Create a channel first.
                </div>
              ) : (
                channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedChannel && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="use-knowledge-base" className="text-sm font-medium cursor-pointer">
                  Use Channel Knowledge Base
                </Label>
                <p className="text-xs text-muted-foreground">
                  Generate questions from channel documents
                </p>
              </div>
            </div>
            <Switch
              id="use-knowledge-base"
              checked={useChannelKnowledgeBase}
              onCheckedChange={setUseChannelKnowledgeBase}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="topic" className="text-sm font-medium">
            Quiz Topic
          </Label>
          <Input
            id="topic"
            placeholder="e.g., World History, JavaScript, Biology..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm font-medium">
            Language
          </Label>
          <Select value={language} onValueChange={(v) => setLanguage(v as "bn" | "en" | "hi")}>
            <SelectTrigger id="language" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bn">Bengali (বাংলা)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="systemPrompt" className="text-sm font-medium">
            Custom Instructions (Optional)
          </Label>
          <textarea
            id="systemPrompt"
            placeholder="Add custom instructions for quiz generation... e.g., Focus on practical examples, Include real-world scenarios, Make it beginner-friendly, etc."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-24 px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="count" className="text-sm font-medium">
              Number of Questions
            </Label>
            <Select value={questionCount} onValueChange={setQuestionCount}>
              <SelectTrigger id="count" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Questions</SelectItem>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty" className="text-sm font-medium">
              Difficulty Level
            </Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}>
              <SelectTrigger id="difficulty" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!topic.trim() || isGenerating}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Quiz
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};