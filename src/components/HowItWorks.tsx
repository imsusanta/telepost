import { Upload, Sparkles, Send, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Your Content",
    description: "Drop your PDFs, study notes, or textbooks. Our AI instantly analyzes and understands your material.",
    color: "from-primary to-accent",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Generates Quizzes",
    description: "Smart algorithms create engaging, curriculum-aligned questions with multiple difficulty levels.",
    color: "from-accent to-secondary",
  },
  {
    number: "03",
    icon: Send,
    title: "Auto-Post to Telegram",
    description: "Schedule and automatically publish quizzes to your channel. Set it once, run for months.",
    color: "from-secondary to-success",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Track & Optimize",
    description: "Monitor engagement analytics and receive auto-generated explanation PDFs after each quiz.",
    color: "from-success to-primary",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-20 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-sm clay-card mb-6">
            <span className="text-sm font-medium text-primary">Simple Process</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            How It
            <span className="text-gradient bg-gradient-to-r from-primary via-accent to-secondary"> Works</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From content to engagement in four simple steps. No technical expertise required.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative group animate-scale-in"
              style={{ animationDelay: `${idx * 0.15}s` }}
            >
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-border to-transparent z-0">
                  <ArrowRight className="absolute -right-4 -top-2 w-4 h-4 text-border" />
                </div>
              )}

              <div className="relative clay-card-hover bg-card/50 backdrop-blur-sm p-8 h-full">
                {/* Step number */}
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-background clay-card flex items-center justify-center">
                  <span className={`text-sm font-bold text-gradient bg-gradient-to-r ${step.color}`}>
                    {step.number}
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-clay`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom decoration */}
        <div className="mt-16 text-center animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="inline-flex items-center gap-3 px-6 py-3 clay-card bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Average setup time:</span>
            </div>
            <span className="text-sm font-bold text-foreground">Under 5 minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
};
