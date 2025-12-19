import { Upload, Sparkles, Send } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drop your PDFs, notes, or textbooks.",
  },
  {
    icon: Sparkles,
    title: "Generate",
    description: "AI creates tailored questions instantly.",
  },
  {
    icon: Send,
    title: "Deliver",
    description: "Auto-post to Telegram on schedule.",
  },
];

export const HowItWorks = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section 
      id="how-it-works" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-4 sm:px-6 lg:px-8" 
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-16 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <h2 
            id="how-it-works-heading" 
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
          >
            How it works
          </h2>
          <p className="text-muted-foreground">
            Three simple steps to transform your workflow.
          </p>
        </div>

        {/* Horizontal timeline */}
        <div className="relative">
          {/* Animated connection line */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-primary/50 via-secondary/50 to-accent/50 transition-all duration-1000 ease-out ${
                isInView ? "w-full" : "w-0"
              }`}
              style={{ transitionDelay: "400ms" }}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div 
                key={idx} 
                className={`relative text-center transition-all duration-700 ${
                  isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${idx * 150 + 200}ms` }}
              >
                {/* Icon circle with animation */}
                <div className="group relative inline-flex items-center justify-center w-16 h-16 rounded-full border border-border bg-background mb-6 z-10 transition-all duration-300 hover:border-primary hover:shadow-glow-sm cursor-default">
                  <step.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  
                  {/* Pulse ring on hover */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/50 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
                </div>
                
                {/* Step number badge */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border text-xs font-medium text-muted-foreground flex items-center justify-center transition-all duration-500 ${
                  isInView ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`}
                style={{ transitionDelay: `${idx * 150 + 400}ms` }}
                >
                  {idx + 1}
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
