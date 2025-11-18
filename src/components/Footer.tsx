import { Sparkles, Send } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="py-16 px-4 border-t border-border/50 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-clay">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient bg-gradient-to-r from-primary to-accent">QuizGenie</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered quiz generation for Telegram channels
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">Product</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Features</a></li>
              <li><a href="#use-cases" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Use Cases</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">Resources</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Guide</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-foreground">Company</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">About</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Privacy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Terms</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors inline-block hover:translate-x-1 transition-transform">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 QuizGenie. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <a href="#" className="clay-card p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors hover:scale-110">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
            </a>
            <a href="#" className="clay-card p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors hover:scale-110">
              <Send className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
