import { useInView } from "@/hooks/useInView";
import { Send, FileText, Cloud, Smartphone, Globe, Zap, type LucideIcon } from "lucide-react";

const integrations: {
  icon: LucideIcon;
  name: string;
  description: string;
  color: string;
  coming?: boolean;
}[] = [
  {
    icon: Send,
    name: "Telegram",
    description: "Auto-post quizzes to your channels",
    color: "from-[#0088cc] to-[#0088cc]/70",
  },
  {
    icon: FileText,
    name: "PDF Export",
    description: "Generate detailed explanations",
    color: "from-destructive to-destructive/70",
  },
  {
    icon: Cloud,
    name: "Google Drive",
    description: "Document import is not available yet",
    color: "from-[#4285f4] to-[#4285f4]/70",
    coming: true,
  },
  {
    icon: Smartphone,
    name: "WhatsApp",
    description: "Coming soon",
    color: "from-[#25d366] to-[#25d366]/70",
    coming: true,
  },
  {
    icon: Globe,
    name: "Web Embed",
    description: "Public quiz embeds are not available yet",
    color: "from-secondary to-secondary/70",
    coming: true,
  },
  {
    icon: Zap,
    name: "Zapier",
    description: "Third-party automation is not available yet",
    color: "from-[#ff4a00] to-[#ff4a00]/70",
    coming: true,
  },
];

export const Integrations = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-t border-border/50"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Works with your
            <span className="text-gradient-primary"> favorite tools</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Seamlessly integrate with the platforms you already use
          </p>
        </div>

        {/* Integrations grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration, idx) => (
            <div
              key={idx}
              className={`group relative p-6 rounded-2xl border border-border/50 bg-card/30 transition-all duration-500 hover:border-primary/30 hover:shadow-glow-sm ${
                isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              } ${integration.coming ? "opacity-60" : ""}`}
              style={{ transitionDelay: `${idx * 100 + 200}ms` }}
            >
              {/* Icon */}
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} mb-4`}
              >
                <integration.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                {integration.name}
                {integration.coming && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Soon
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {integration.description}
              </p>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
