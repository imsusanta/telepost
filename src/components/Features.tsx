import { BarChart3, Clock, FileText, Send, Shield, Sparkles, Zap } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Upload any document and our AI creates curriculum-aligned questions instantly with 99% accuracy.",
    color: "from-primary to-accent",
  },
  {
    icon: Send,
    title: "Telegram Integration",
    description: "Auto-post quizzes to your channel. Students answer directly in Telegram with real-time feedback.",
    color: "from-secondary to-primary",
  },
  {
    icon: FileText,
    title: "Instant Explanations",
    description: "Beautiful PDFs with detailed answers and explanations delivered automatically after each quiz.",
    color: "from-accent to-secondary",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description: "Set up months of content in minutes. Timezone-aware and engagement-optimized delivery.",
    color: "from-success to-secondary",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track participation, identify weak topics, and measure student progress with detailed insights.",
    color: "from-primary to-success",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption with SOC 2 compliance. Your data stays protected at all times.",
    color: "from-accent to-primary",
  },
];

export const Features = () => {
  return (
    <section id="features" className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" aria-labelledby="features-heading">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 text-sm mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Powerful Features</span>
          </div>
          <h2 id="features-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            Everything you need to
            <span className="text-gradient-primary block">scale your teaching</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to save time, increase engagement, and deliver measurable results.
          </p>
        </div>

        {/* Features grid */}
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 list-none">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className="group glass-card p-8 card-hover"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-glow-sm group-hover:shadow-glow transition-all duration-500`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>

        {/* Bottom stats */}
        <div className="mt-20 glass-card p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "99.9%", label: "Uptime SLA" },
              { value: "<100ms", label: "API Response" },
              { value: "50+", label: "Integrations" },
              { value: "24/7", label: "Support" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-gradient-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
