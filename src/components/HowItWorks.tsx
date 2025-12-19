import { Upload, Sparkles, Send, BarChart3 } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drop your PDFs, notes, textbooks, or paste any text content.",
  },
  {
    icon: Sparkles,
    title: "Generate",
    description: "AI analyzes content and creates tailored questions instantly.",
  },
  {
    icon: Send,
    title: "Deliver",
    description: "Auto-post quizzes to Telegram on your preferred schedule.",
  },
  {
    icon: BarChart3,
    title: "Analyze",
    description: "Track performance and identify areas for improvement.",
  },
];

export const HowItWorks = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section 
      id="how-it-works" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8" 
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-20 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <h2 
            id="how-it-works-heading" 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6"
          >
            From document to quiz in
            <span className="text-gradient-primary"> 60 seconds</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to transform your teaching workflow forever
          </p>
        </div>

        {/* Horizontal timeline */}
        <div className="relative">
          {/* Animated connection line */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-px overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r from-primary/50 via-secondary/50 to-accent/50 transition-all duration-1500 ease-out ${
                isInView ? "w-full" : "w-0"
              }`}
              style={{ transitionDelay: "400ms" }}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, idx) => (
              <div 
                key={idx} 
                className={`relative text-center transition-all duration-700 ${
                  isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${idx * 150 + 200}ms` }}
              >
                {/* Icon circle with animation */}
                <div className="group relative inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-border bg-background mb-8 z-10 transition-all duration-300 hover:border-primary hover:shadow-glow cursor-default">
                  <step.icon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  
                  {/* Pulse ring on hover */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/50 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
                </div>
                
                {/* Step number badge */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center transition-all duration-500 shadow-glow-sm ${
                  isInView ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`}
                style={{ transitionDelay: `${idx * 150 + 400}ms` }}
                >
                  {idx + 1}
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
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
