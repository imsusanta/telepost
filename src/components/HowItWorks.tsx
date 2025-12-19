import { Upload, Sparkles, Send } from "lucide-react";

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
  return (
    <section 
      id="how-it-works" 
      className="py-24 px-4 sm:px-6 lg:px-8" 
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 
            id="how-it-works-heading" 
            className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4"
          >
            How it works
          </h2>
          <p className="text-muted-foreground">
            Three simple steps to transform your workflow.
          </p>
        </div>

        {/* Horizontal timeline */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-border" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative text-center">
                {/* Icon circle */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-border bg-background mb-6 relative z-10">
                  <step.icon className="w-6 h-6 text-muted-foreground" />
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
