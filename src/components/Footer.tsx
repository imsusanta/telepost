import Sparkles from "lucide-react/dist/esm/icons/sparkles";

export const Footer = () => {
  return (
    <footer className="py-12 px-4 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              QuizGenie
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} QuizGenie. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
