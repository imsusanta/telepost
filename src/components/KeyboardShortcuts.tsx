import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
}

export function KeyboardShortcuts() {
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    {
      key: "g d",
      description: "Go to Dashboard",
      action: () => navigate("/dashboard"),
    },
    {
      key: "g c",
      description: "Go to Create Quiz",
      action: () => navigate("/dashboard/create-quiz"),
    },
    {
      key: "g b",
      description: "Go to Connect Bot",
      action: () => navigate("/dashboard/connect-bot"),
    },
    {
      key: "g s",
      description: "Go to Scheduler",
      action: () => navigate("/dashboard/scheduler"),
    },
    {
      key: "g a",
      description: "Go to Analytics",
      action: () => navigate("/dashboard/analytics"),
    },
    {
      key: "g q",
      description: "Go to Question Bank",
      action: () => navigate("/dashboard/question-bank"),
    },
    {
      key: "g l",
      description: "Go to Leaderboards",
      action: () => navigate("/dashboard/leaderboards"),
    },
    {
      key: "?",
      description: "Show keyboard shortcuts",
      action: () => setShowDialog(true),
    },
  ];

  useEffect(() => {
    let buffer = "";
    let bufferTimeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle single key shortcuts
      if (e.key === "?") {
        e.preventDefault();
        setShowDialog(true);
        return;
      }

      // Handle escape to close dialog
      if (e.key === "Escape") {
        setShowDialog(false);
        buffer = "";
        return;
      }

      // Build key sequence buffer
      clearTimeout(bufferTimeout);
      buffer += e.key.toLowerCase();

      // Check if buffer matches any shortcut
      const matchedShortcut = shortcuts.find((s) => s.key === buffer);
      if (matchedShortcut) {
        e.preventDefault();
        matchedShortcut.action();
        buffer = "";
      }

      // Clear buffer after 1 second
      bufferTimeout = setTimeout(() => {
        buffer = "";
      }, 1000);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      clearTimeout(bufferTimeout);
    };
  }, [navigate]);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate faster with keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Tip: Press <kbd className="px-1 py-0.5 bg-muted border border-border rounded">?</kbd> anytime to see this list
        </div>
      </DialogContent>
    </Dialog>
  );
}
