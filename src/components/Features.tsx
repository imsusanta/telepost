import { Sparkles, Send, FileText, BarChart3 } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const features = [
  {
    icon: Sparkles,
    title: "AI Generation",
    description: "Upload documents, get curriculum-aligned questions instantly.",
  },
  {
    icon: Send,
    title: "Telegram Delivery",
    description: "Auto-post quizzes. Students answer in real-time.",
  },
  {
    icon: FileText,
    title: "Instant PDFs",
    description: "Detailed explanations delivered after each quiz.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Track progress and identify weak topics.",
  },
];

export const Features = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section 
      id="features" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50" 
      aria-labelledby="features-heading"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <h2 
            id="features-heading" 
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
          >
            Everything you need
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Powerful features to save time and increase engagement.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group relative p-8 rounded-2xl border border-border/50 bg-card/30 transition-all duration-500 cursor-default overflow-hidden ${
                idx === 0 ? "sm:col-span-2" : ""
              } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ 
                transitionDelay: isInView ? `${idx * 100}ms` : "0ms"
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Icon with glow */}
              <div className="relative mb-4">
                <feature.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                <div className="absolute inset-0 w-6 h-6 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              
              <h3 className="relative text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Subtle border glow on hover */}
              <div className="absolute inset-0 rounded-2xl border border-primary/0 group-hover:border-primary/20 transition-colors duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
