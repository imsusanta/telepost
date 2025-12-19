import { Twitter, Github, Linkedin, Mail } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { Button } from "./ui/button";

export const Footer = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const footerLinks = {
    Product: ["Features", "Pricing", "Integrations", "Changelog"],
    Resources: ["Documentation", "API Reference", "Blog", "Community"],
    Company: ["About", "Careers", "Contact", "Partners"],
    Legal: ["Privacy", "Terms", "Security", "GDPR"],
  };

  return (
    <footer 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-20 px-4 border-t border-border/50" 
      role="contentinfo"
    >
      <div className={`max-w-6xl mx-auto transition-all duration-700 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}>
        {/* Newsletter signup */}
        <div className="text-center mb-16 pb-16 border-b border-border/50">
          <h3 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-4">
            Stay in the loop
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Get the latest updates on features, tips, and education technology trends.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 h-12 px-4 rounded-full border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button className="h-12 px-8 rounded-full bg-foreground text-background hover:bg-foreground/90">
              Subscribe
            </Button>
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          {/* Logo and description */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-2xl font-display font-bold text-foreground mb-4">
              TelePost
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              AI-powered quiz platform for modern educators.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-1">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Github, label: "GitHub" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Mail, label: "Email" },
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

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a 
                      href="#" 
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                    >
                      {link}
                      <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TelePost. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <span className="text-destructive">❤️</span>
            <span>for educators worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
