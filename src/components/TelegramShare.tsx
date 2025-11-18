import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, HelpCircle, Calendar, Zap, Hash } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz } from "@/types/quiz";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelService, TelegramChannel } from "@/services/channelService";
import { useAuth } from "@/contexts/AuthContext";

interface TelegramShareProps {
  quiz: Quiz;
  selectedChannelId?: string;
}

export const TelegramShare = ({ quiz, selectedChannelId }: TelegramShareProps) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>(selectedChannelId || "");
  const [customChatId, setCustomChatId] = useState("");
  const [useCustomChannel, setUseCustomChannel] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState<string>("5");
  const [instantPoll, setInstantPoll] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadChannels();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChannelId) {
      setSelectedChannel(selectedChannelId);
    }
  }, [selectedChannelId]);

  const loadChannels = async () => {
    try {
      const data = await ChannelService.getActiveChannels(user!.id);
      setChannels(data);

      // Auto-select default channel if none selected
      if (!selectedChannel && data.length > 0) {
        const defaultChannel = data.find((c) => c.is_default) || data[0];
        setSelectedChannel(defaultChannel.id);
      }
    } catch (error) {
      console.error("Failed to load channels:", error);
    }
  };

  const getChatId = (): string => {
    if (useCustomChannel) {
      return customChatId.trim();
    }

    const channel = channels.find((c) => c.id === selectedChannel);
    return channel?.telegram_channel_id || "";
  };

  const handleTestConnection = async () => {
    const chatId = getChatId();
    if (!chatId) {
      toast.error("Please select a channel or enter a Chat ID");
      return;
    }

    let correctedChatId = chatId;
    if (/^\d+$/.test(correctedChatId) && correctedChatId.startsWith("100")) {
      correctedChatId = `-${correctedChatId}`;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("test-telegram-connection", {
        body: { chatId: correctedChatId },
      });

      if (error) throw error;

      if (data.success) {
        setTestResult({ success: true, message: data.message });
        toast.success("✓ Connection successful! Bot can access this chat.");
      } else {
        setTestResult({ success: false, message: data.error });
        toast.error(data.error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : "Failed to test connection. Please check your bot token and chat ID.";
      setTestResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSend = async () => {
    const chatId = getChatId();
    if (!chatId) {
      toast.error("Please select a channel or enter a Chat ID");
      return;
    }

    if (isScheduled && !scheduleInterval) {
      toast.error("Please select a schedule interval");
      return;
    }

    // Auto-correct common chat ID format issues
    let correctedChatId = chatId;

    // If user enters a number starting with "100" (likely forgot the minus sign)
    if (/^\d+$/.test(correctedChatId) && correctedChatId.startsWith("100")) {
      correctedChatId = `-${correctedChatId}`;
      toast.info(`Auto-corrected chat ID to: ${correctedChatId}`);
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-telegram-quiz", {
        body: {
          chatId: correctedChatId,
          quiz: {
            topic: quiz.topic,
            questions: quiz.questions,
          },
          scheduleInterval: isScheduled ? parseInt(scheduleInterval) : null,
          instantPoll,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Increment channel quiz count if using saved channel
      if (!useCustomChannel && selectedChannel) {
        try {
          await ChannelService.incrementQuizCount(selectedChannel);
        } catch (err) {
          console.error("Failed to increment quiz count:", err);
        }
      }

      if (isScheduled) {
        toast.success(`Quiz scheduled to post every ${scheduleInterval} minute(s) 📅`);
      } else {
        toast.success(`Successfully sent ${data.pollsSent} quiz polls to Telegram! 🎉`);
      }

      setIsOpen(false);
      setCustomChatId("");
      setScheduleInterval("5");
      setIsScheduled(false);
      setInstantPoll(false);
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : "Failed to send quiz to Telegram. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Share to Telegram
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Quiz to Telegram</DialogTitle>
          <DialogDescription>
            Send this quiz as interactive polls to any Telegram chat or channel
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {channels.length > 0 && !useCustomChannel ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="channel">Select Channel</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseCustomChannel(true)}
                  className="text-xs"
                >
                  Use Custom ID
                </Button>
              </div>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger id="channel" disabled={isSending}>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span>{channel.channel_name}</span>
                        {channel.is_default && (
                          <span className="text-xs text-muted-foreground">(Default)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedChannel && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTesting || isSending}
                    className="text-xs"
                  >
                    {isTesting ? "Testing..." : "Test Connection"}
                  </Button>
                  {testResult && (
                    <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
                      {testResult.success ? "✓ Connected" : "✗ Failed"}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="chatId">Telegram Chat ID</Label>
                {channels.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseCustomChannel(false)}
                    className="text-xs"
                  >
                    Use Saved Channel
                  </Button>
                )}
              </div>
              <Input
                id="chatId"
                placeholder="e.g., -1001234567890 or @channelname"
                value={customChatId}
                onChange={(e) => setCustomChatId(e.target.value)}
                disabled={isSending}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={!customChatId.trim() || isTesting || isSending}
                  className="text-xs"
                >
                  {isTesting ? "Testing..." : "Test Connection"}
                </Button>
                {testResult && (
                  <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
                    {testResult.success ? "✓ Connected" : "✗ Failed"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                For channels: Use -100xxxxxxxxxx format (with minus sign)
              </p>
            </div>
          )}

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <div className="space-y-0.5">
                <Label htmlFor="instant-mode" className="text-sm font-medium cursor-pointer">
                  Instant Poll Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Send all polls immediately without delays
                </p>
              </div>
            </div>
            <Switch
              id="instant-mode"
              checked={instantPoll}
              onCheckedChange={setInstantPoll}
              disabled={isSending}
            />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <div className="space-y-0.5">
                <Label htmlFor="schedule-mode" className="text-sm font-medium cursor-pointer">
                  Schedule Recurring Posts
                </Label>
                <p className="text-xs text-muted-foreground">
                  Post quiz questions at regular intervals
                </p>
              </div>
            </div>
            <Switch
              id="schedule-mode"
              checked={isScheduled}
              onCheckedChange={setIsScheduled}
              disabled={isSending}
            />
          </div>

          {isScheduled && (
            <div className="space-y-2">
              <Label htmlFor="schedule-interval">Post Interval (minutes)</Label>
              <Select value={scheduleInterval} onValueChange={setScheduleInterval}>
                <SelectTrigger id="schedule-interval" disabled={isSending}>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every 1 minute</SelectItem>
                  <SelectItem value="2">Every 2 minutes</SelectItem>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="10">Every 10 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="20">Every 20 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quiz questions will be posted at this interval
              </p>
            </div>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground space-y-2">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">How to get your Chat ID:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Add your bot to the chat/channel</li>
                  <li>Send a message in that chat</li>
                  <li>Visit: <code className="text-xs bg-background px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
                  <li>Look for "chat" id in the response</li>
                </ol>
                <p className="text-xs mt-2">
                  For channels: Use @channelname or the numeric ID (starts with -100)
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={!getChatId() || isSending || (isScheduled && !scheduleInterval)}
            className="w-full"
          >
            {isSending ? (
              <>
                <Send className="w-4 h-4 mr-2 animate-pulse" />
                {isScheduled ? "Scheduling..." : "Sending Quiz..."}
              </>
            ) : (
              <>
                {isScheduled ? (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule {quiz.questions.length} Polls
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send {quiz.questions.length} Polls to Telegram
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};