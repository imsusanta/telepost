import { useState } from "react";
import { Sparkles, Menu, X } from "lucide-react";
import { Button } from "./ui/button";

interface NavigationProps {
  onGetStarted?: () => void;
}

export const Navigation = ({ onGetStarted }: NavigationProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              QuizGenie
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#use-cases" className="text-gray-300 hover:text-white transition-colors">Use Cases</a>
            <Button
              onClick={onGetStarted}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all"
            >
              Get Started
            </Button>
          </div>

          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-white/5">
          <div className="px-4 py-4 space-y-3">
            <a href="#features" className="block text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#use-cases" className="block text-gray-300 hover:text-white transition-colors">Use Cases</a>
            <Button
              onClick={onGetStarted}
              className="w-full px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-medium"
            >
              Get Started
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};
