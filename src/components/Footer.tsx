import { Twitter, Github, Linkedin, Mail, Send, Heart, Globe, ChevronDown } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export const Footer = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const footerSections = [
    {
      title: "COMPANY",
      titleColor: "text-purple-600 dark:text-purple-400",
      links: [
        { label: "About Us", href: "#" },
        { label: "Contact Us", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Blog", href: "#" },
      ],
    },
    {
      title: "LEGAL",
      titleColor: "text-emerald-600 dark:text-emerald-400",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms & Conditions", href: "/terms" },
        { label: "Refund Policy", href: "/refund-policy" },
        { label: "Data Security", href: "/data-security" },
      ],
    },
    {
      title: "SUPPORT",
      titleColor: "text-amber-600 dark:text-amber-400",
      links: [
        { label: "Documentation", href: "/documentation" },
        { label: "Help Center", href: "#" },
        { label: "Video Tutorials", href: "#" },
        { label: "Contact Support", href: "#" },
      ],
    },
  ];

  return (
    <footer
      ref={ref as React.RefObject<HTMLElement>}
      className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50 bg-gradient-to-b from-transparent to-muted/20"
      role="contentinfo"
    >
      <div className={`max-w-6xl mx-auto transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          {/* Logo & Bio Column */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <div className="text-2xl font-display font-extrabold text-foreground mb-3 flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center text-[#0088cc] shrink-0">
                  <Send className="w-6 h-6 fill-[#0088cc] text-[#0088cc]" />
                </div>
                <span>TelePost</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">
                Empowering educators with AI-driven Telegram automation and engagement tools.
              </p>
            </div>

            {/* Social Media Buttons */}
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Github, label: "GitHub" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Mail, label: "Email" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="w-9 h-9 rounded-full bg-card border border-border/80 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 shadow-sm transition-all duration-300 hover:scale-105"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* 3 Categorized Columns */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-4">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${section.titleColor}`}>
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar from Screenshot */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/60 text-xs text-muted-foreground">
          {/* Copyright */}
          <div>
            © 2026 TelePost Inc. &bull; All rights reserved.
          </div>

          {/* Center Heart Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border/60 bg-card/80 shadow-sm text-xs font-medium">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>Proudly built for educators</span>
          </div>

          {/* Language Dropdown Selector Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-card/80 shadow-sm text-xs font-medium cursor-pointer hover:bg-muted/50 transition-colors">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <span>English</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </footer>
  );
};
