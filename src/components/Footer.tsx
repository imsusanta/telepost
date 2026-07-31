import { Twitter, Github, Linkedin, Mail } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { TelePostLogoIcon } from "./TelePostLogo";

export const Footer = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const footerLinks = {
    Company: [
      { label: "Features", href: "#features" },
      { label: "How it Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
    Resources: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Community", href: "#" },
      { label: "Support", href: "#" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Security", href: "#" },
    ],
  };

  return (
    <footer
      ref={ref as React.RefObject<HTMLElement>}
      className="border-t border-border/50 bg-card/30 pt-20 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      <div className={`max-w-6xl mx-auto transition-all duration-700 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Logo and description */}
          <div className="md:col-span-4 space-y-6">
            <div>
              <div className="text-2xl font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center">
                  <TelePostLogoIcon className="w-6 h-6" />
                </div>
                TelePost
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Empowering educators with AI-driven telegram automation and engagement tools.
              </p>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Github, label: "GitHub" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Mail, label: "Email" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300 border border-transparent hover:border-primary/10"
                  aria-label={label}
                >
                  <Icon className="w-4.5 h-4.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category} className="space-y-5">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">{category}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-all duration-200 inline-flex items-center group"
                      >
                        <span className="relative">
                          {link.label}
                          <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} TelePost Inc.</p>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>Built for the future of education</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground group cursor-default">
            <span>Made with</span>
            <span className="text-destructive transition-transform duration-300 group-hover:scale-125 inline-block">❤️</span>
            <span>by educators</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
