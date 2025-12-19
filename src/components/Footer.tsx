import { Twitter, Github, Linkedin } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export const Footer = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <footer 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-12 px-4 border-t border-border/50" 
      role="contentinfo"
    >
      <div className={`max-w-5xl mx-auto transition-all duration-700 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="text-lg font-display font-semibold text-foreground hover:text-primary transition-colors cursor-default">
            TelePost
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {["Features", "FAQ", "Privacy", "Terms"].map((link, idx) => (
              <a 
                key={link}
                href={link === "Features" ? "#features" : link === "FAQ" ? "#faq" : "#"} 
                className="relative hover:text-foreground transition-colors group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {link}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Social */}
          <div className="flex items-center gap-1">
            {[
              { icon: Twitter, label: "Twitter" },
              { icon: Github, label: "GitHub" },
              { icon: Linkedin, label: "LinkedIn" },
            ].map(({ icon: Icon, label }) => (
              <a 
                key={label}
                href="#" 
                className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all duration-300"
                aria-label={label}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TelePost. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
