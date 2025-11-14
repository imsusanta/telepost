import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Send, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz } from "@/types/quiz";

interface TelegramShareProps {
  quiz: Quiz;
}

export const TelegramShare = ({ quiz }: TelegramShareProps) => {
  const [chatId, setChatId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = async () => {
    if (!chatId.trim()) {
      toast.error("Please enter a Chat ID");
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
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Successfully sent ${data.pollsSent} quiz polls to Telegram! 🎉`);
      setIsOpen(false);
      setChatId("");
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
            disabled={!chatId.trim() || isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Send className="w-4 h-4 mr-2 animate-pulse" />
                Sending Quiz...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send {quiz.questions.length} Polls to Telegram
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};