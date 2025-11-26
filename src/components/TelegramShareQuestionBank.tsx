import { useState } from "react";
import { Calendar, HelpCircle, Send, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuestionBankItem } from "@/services/questionBankService";
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

interface TelegramShareQuestionBankProps {
  selectedQuestions: QuestionBankItem[];
  onClearSelection?: () => void;
}

export const TelegramShareQuestionBank = ({ selectedQuestions, onClearSelection }: TelegramShareQuestionBankProps) => {
  const [chatId, setChatId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleInterval, setScheduleInterval] = useState<string>("5");
  const [minQuestionsPerInterval, setMinQuestionsPerInterval] = useState<string>("5");
  const [customMinQuestions, setCustomMinQuestions] = useState<string>("");
  const [instantPoll, setInstantPoll] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleTestConnection = async () => {
    if (!chatId.trim()) {
      toast.error("Please enter a Chat ID");
      return;
    }

    let correctedChatId = chatId.trim();
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

  const handleSendConfirmation = () => {
    if (!chatId.trim()) {
      toast.error("Please enter a Chat ID");
      return;
    }

    if (isScheduled && !scheduleInterval) {
      toast.error("Please select a schedule interval");
      return;
    }

    // Validate minimum questions per interval
    if (isScheduled) {
      if (minQuestionsPerInterval === "custom") {
        const customValue = parseInt(customMinQuestions);
        if (!customMinQuestions || isNaN(customValue) || customValue < 1) {
          toast.error("Please enter a valid custom number of questions (minimum 1)");
          return;
        }
      }
    }

    setShowConfirmDialog(true);
  };

  const handleSend = async () => {
    setShowConfirmDialog(false);

    // Validate minimum questions per interval
    let minQuestions = 1;
    if (isScheduled) {
      if (minQuestionsPerInterval === "custom") {
        minQuestions = parseInt(customMinQuestions);
      } else {
        minQuestions = parseInt(minQuestionsPerInterval);
      }
    }

    // Auto-correct common chat ID format issues
    let correctedChatId = chatId.trim();

    // If user enters a number starting with "100" (likely forgot the minus sign)
    if (/^\d+$/.test(correctedChatId) && correctedChatId.startsWith("100")) {
      correctedChatId = `-${correctedChatId}`;
      toast.info(`Auto-corrected chat ID to: ${correctedChatId}`);
    }

    setIsSending(true);
    try {
      // Convert QuestionBankItems to the format expected by the edge function
      const questions = selectedQuestions.map(q => ({
        question: q.question,
        options: q.options,
        correct_option_index: q.correct_option_index,
        explanation: q.explanation,
      }));

      // Determine topic for the quiz (use most common topic or "Mixed")
      const topicCounts: Record<string, number> = {};
      selectedQuestions.forEach(q => {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
      });
      const mostCommonTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Mixed Topics";
      const topic = selectedQuestions.length === 1
        ? selectedQuestions[0].topic
        : topicCounts[mostCommonTopic] === selectedQuestions.length
          ? mostCommonTopic
          : "Mixed Topics";

      const { data, error } = await supabase.functions.invoke("send-telegram-quiz", {
        body: {
          chatId: correctedChatId,
          quiz: {
            topic,
            questions,
          },
          scheduleInterval: isScheduled ? parseInt(scheduleInterval) : null,
          minQuestionsPerInterval: isScheduled ? minQuestions : null,
          instantPoll,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (isScheduled) {
        toast.success(`Questions scheduled to post every ${scheduleInterval} minute(s) 📅`);
      } else {
        toast.success(`Successfully sent ${data.pollsSent} quiz polls to Telegram! 🎉`);
      }

      setIsOpen(false);
      setChatId("");
      setScheduleInterval("5");
      setMinQuestionsPerInterval("5");
      setCustomMinQuestions("");
      setIsScheduled(false);
      setInstantPoll(false);

      // Clear selection after successful send
      if (onClearSelection) {
        onClearSelection();
      }
    } catch (error) {
      const errorMsg = error instanceof Error
        ? error.message
        : "Failed to send questions to Telegram. Please try again.";
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            className="gap-2"
            disabled={selectedQuestions.length === 0}
          >
            <Send className="w-4 h-4" />
            Send to Telegram ({selectedQuestions.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Questions to Telegram</DialogTitle>
            <DialogDescription>
              Send {selectedQuestions.length} selected question(s) as interactive polls to any Telegram chat or channel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chatId">Telegram Chat ID</Label>
              <Input
                id="chatId"
                placeholder="e.g., -1001234567890 or @channelname"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                disabled={isSending}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={!chatId.trim() || isTesting || isSending}
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

            {isScheduled && (
              <div className="space-y-2">
                <Label htmlFor="min-questions">Questions per Post</Label>
                <Select value={minQuestionsPerInterval} onValueChange={setMinQuestionsPerInterval}>
                  <SelectTrigger id="min-questions" disabled={isSending}>
                    <SelectValue placeholder="Select number of questions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 question</SelectItem>
                    <SelectItem value="5">5 questions</SelectItem>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="15">15 questions</SelectItem>
                    <SelectItem value="custom">Custom number</SelectItem>
                  </SelectContent>
                </Select>
                {minQuestionsPerInterval === "custom" && (
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter number of questions"
                    value={customMinQuestions}
                    onChange={(e) => setCustomMinQuestions(e.target.value)}
                    disabled={isSending}
                    className="mt-2"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Number of questions to post at each interval
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
              onClick={handleSendConfirmation}
              disabled={!chatId.trim() || isSending || (isScheduled && !scheduleInterval)}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Send className="w-4 h-4 mr-2 animate-pulse" />
                  {isScheduled ? "Scheduling..." : "Sending Questions..."}
                </>
              ) : (
                <>
                  {isScheduled ? (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule {selectedQuestions.length} Polls
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send {selectedQuestions.length} Polls to Telegram
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send to Telegram</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send {selectedQuestions.length} question(s) to Telegram.
              {isScheduled ? (
                <span className="block mt-2">
                  Questions will be posted every {scheduleInterval} minute(s).
                </span>
              ) : (
                <span className="block mt-2">
                  All questions will be sent as individual polls.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={isSending}>
              {isSending ? "Sending..." : "Confirm Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
