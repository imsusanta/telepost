import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, HelpCircle, Calendar, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz } from "@/types/quiz";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

interface TelegramShareProps {
  quiz: Quiz;
}

export const TelegramShare = ({ quiz }: TelegramShareProps) => {
  const [chatId, setChatId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [instantPoll, setInstantPoll] = useState(false);

  const handleSend = async () => {
    if (!chatId.trim()) {
      toast.error("Please enter a Chat ID");
      return;
    }

    if (isScheduled && !scheduledTime) {
      toast.error("Please select a scheduled time");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-telegram-quiz", {
        body: {
          chatId: chatId.trim(),
          quiz: {
            topic: quiz.topic,
            questions: quiz.questions,
          },
          scheduled: isScheduled ? scheduledTime : null,
          instantPoll,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (isScheduled) {
        toast.success(`Quiz scheduled for ${format(new Date(scheduledTime), "PPp")} 📅`);
      } else {
        toast.success(`Successfully sent ${data.pollsSent} quiz polls to Telegram! 🎉`);
      }
      
      setIsOpen(false);
      setChatId("");
      setScheduledTime("");
      setIsScheduled(false);
      setInstantPoll(false);
    } catch (error) {
      console.error("Error sending to Telegram:", error);
      toast.error("Failed to send quiz to Telegram. Please try again.");
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
          <div className="space-y-2">
            <Label htmlFor="chatId">Telegram Chat ID</Label>
            <Input
              id="chatId"
              placeholder="e.g., -1001234567890 or @channelname"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              disabled={isSending}
            />
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
                  Schedule Post
                </Label>
                <p className="text-xs text-muted-foreground">
                  Send quiz at a specific time
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
              <Label htmlFor="scheduled-time">Scheduled Time</Label>
              <Input
                id="scheduled-time"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                disabled={isSending}
                min={new Date().toISOString().slice(0, 16)}
              />
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
            disabled={!chatId.trim() || isSending || (isScheduled && !scheduledTime)}
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