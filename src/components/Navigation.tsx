import { useState } from "react";
import { Sparkles, Menu, X } from "lucide-react";

interface NavigationProps {
  onGetStarted?: () => void;
}

export const Navigation = ({ onGetStarted: _onGetStarted }: NavigationProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border shadow-clay">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-clay">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient bg-gradient-to-r from-primary to-accent">
              QuizGenie
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-foreground/70 hover:text-foreground transition-colors font-medium">
              Features
            </a>
            <a href="#use-cases" className="text-foreground/70 hover:text-foreground transition-colors font-medium">
              Use Cases
            </a>
            <a href="/auth" className="px-5 py-2 text-foreground/70 hover:text-foreground transition-colors font-medium">
              Sign In
            </a>
            <a href="/auth" className="clay-button px-6 py-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-2xl font-semibold">
              Try Free
            </a>
          </div>

          <button
            className="md:hidden text-foreground clay-card p-2 rounded-xl"
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
        <div id="mobile-menu" className="md:hidden bg-card/95 backdrop-blur-xl border-t border-border shadow-clay-lg animate-slide-up">
          <div className="px-4 py-4 space-y-3" role="menu">
            <a href="#features" className="block text-foreground/70 hover:text-foreground transition-colors font-medium py-2">
              Features
            </a>
            <a href="#use-cases" className="block text-foreground/70 hover:text-foreground transition-colors font-medium py-2">
              Use Cases
            </a>
            <a href="/auth" className="block text-foreground/70 hover:text-foreground transition-colors font-medium py-2">
              Sign In
            </a>
            <a href="/auth" className="clay-button block w-full px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-2xl font-semibold text-center mt-2">
              Try Free
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};
