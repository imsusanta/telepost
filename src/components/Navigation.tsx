import { useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";

interface NavigationProps {
  onGetStarted?: () => void;
}

export const Navigation = ({ onGetStarted: _onGetStarted }: NavigationProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              QuizGenie
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            <a href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </a>
            <a href="/auth" className="text-sm px-4 py-2 bg-foreground text-background rounded-full font-medium hover:bg-foreground/90 transition-colors">
              Get started
            </a>
          </div>

          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden bg-background border-t border-border/50">
          <div className="px-4 py-6 space-y-4" role="menu">
            <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#faq" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            <a href="/auth" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </a>
            <a href="/auth" className="block w-full text-sm px-4 py-3 bg-foreground text-background rounded-full font-medium text-center mt-4">
              Get started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};
