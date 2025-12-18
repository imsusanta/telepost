import { Upload, Sparkles, Send, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Content",
    description: "Drop your PDFs, notes, textbooks, or any study material. Our AI analyzes and understands it instantly.",
    color: "from-primary to-accent",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Generate Quizzes",
    description: "AI creates engaging, curriculum-aligned questions tailored to your teaching style and difficulty level.",
    color: "from-secondary to-primary",
  },
  {
    number: "03",
    icon: Send,
    title: "Auto-Post to Telegram",
    description: "Schedule and publish quizzes directly to your Telegram channel. Students answer in real-time.",
    color: "from-accent to-secondary",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Track & Improve",
    description: "Monitor engagement, analyze weak topics, and deliver instant explanations with detailed PDFs.",
    color: "from-success to-primary",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" aria-labelledby="how-it-works-heading">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 text-sm mb-6">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-muted-foreground">Simple Process</span>
          </div>
          <h2 id="how-it-works-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to transform your teaching workflow and save hours every week.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2" />

          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 list-none">
            {steps.map((step, idx) => (
              <li key={idx} className="relative group">
                {/* Arrow connector */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-white/10" />
                  </div>
                )}
                
                <div className="glass-card p-8 h-full card-hover text-center lg:text-left">
                  {/* Step number */}
                  <div className="text-5xl font-display font-bold text-white/5 mb-4">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 mx-auto lg:mx-0 shadow-glow-sm group-hover:shadow-glow transition-all duration-500`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-display font-semibold mb-3 text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Ready to get started? It only takes 5 minutes.
          </p>
          <a href="#" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors">
            Watch the demo video
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
