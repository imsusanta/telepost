import {
  Sparkles,
  BarChart3,
  FileText,
  Clock,
  Upload,
  Zap,
  Languages,
  Shield,
  Palette,
  Database
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Smart Content Upload",
    description: "Drop PDFs, notes, or textbooks. Our AI parses complex documents and extracts key concepts automatically.",
    gradient: "from-primary to-accent",
    highlight: "Any format supported",
  },
  {
    icon: Sparkles,
    title: "AI Quiz Generation",
    description: "Advanced algorithms create curriculum-aligned questions with adjustable difficulty levels and formats.",
    gradient: "from-accent to-secondary",
    highlight: "GPT-4 powered",
  },
  {
    icon: FileText,
    title: "Auto PDF Explanations",
    description: "Beautiful, branded PDFs with detailed answer explanations delivered instantly after each quiz ends.",
    gradient: "from-secondary to-success",
    highlight: "Fully customizable",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description: "Set up months of content in minutes. Timezone-aware scheduling with optimal engagement timing.",
    gradient: "from-success to-primary",
    highlight: "Set & forget",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Track participation, identify weak topics, measure growth. Export detailed reports for stakeholders.",
    gradient: "from-primary to-secondary",
    highlight: "Real-time insights",
  },
  {
    icon: Database,
    title: "50K+ Question Bank",
    description: "Pre-made questions for JEE, NEET, UPSC, and more. Filter by subject, chapter, and difficulty.",
    gradient: "from-accent to-success",
    highlight: "Ready to use",
  },
  {
    icon: Languages,
    title: "Multi-Language",
    description: "Create quizzes in Hindi, English, and regional languages. AI translation maintains context and accuracy.",
    gradient: "from-secondary to-primary",
    highlight: "12+ languages",
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description: "Your logo, colors, and watermarks on all materials. Maintain professional brand consistency.",
    gradient: "from-success to-accent",
    highlight: "White-label ready",
  },
  {
    icon: Zap,
    title: "Batch Generation",
    description: "Generate 30+ quizzes from one document. Schedule an entire month's content in under 5 minutes.",
    gradient: "from-primary to-accent",
    highlight: "10x faster",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant infrastructure. Your content and student data protected with bank-level encryption.",
    gradient: "from-accent to-secondary",
    highlight: "100% secure",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-sm clay-card mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powerful Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Everything You Need to
            <span className="block text-gradient bg-gradient-to-r from-primary via-accent to-secondary mt-2">
              Dominate Engagement
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for educators who demand excellence. Every feature designed to save time and increase impact.
          </p>
        </div>

        {/* Features grid - Premium bento layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group relative clay-card-hover bg-card/50 backdrop-blur-sm p-6 animate-scale-in ${
                idx === 0 || idx === 4 ? 'lg:col-span-1' : ''
              }`}
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity rounded-3xl`} />

              <div className="relative">
                {/* Icon and highlight badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all shadow-clay`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full bg-gradient-to-r ${feature.gradient} text-white opacity-80`}>
                    {feature.highlight}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature highlight banner */}
        <div className="mt-16 clay-card bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 p-8 animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Need a custom feature?
              </h3>
              <p className="text-muted-foreground">
                We build custom integrations for enterprise customers. Let's discuss your needs.
              </p>
            </div>
            <a
              href="#"
              className="clay-button px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-2xl font-semibold whitespace-nowrap hover:from-primary/90 hover:to-accent/90"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
