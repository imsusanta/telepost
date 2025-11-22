import { ReactNode } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/Breadcrumb";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen relative">
      <KeyboardShortcuts />

      {/* Keyboard Shortcut Indicator */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-50 clay-button shadow-clay-lg rounded-full w-12 h-12"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-5 h-5" />
      </Button>

      {/* Main Content */}
      <main className="p-4 md:p-8 min-h-screen" id="main-content">
        <Breadcrumb />
        <div className="animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
