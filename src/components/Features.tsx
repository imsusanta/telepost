import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Clock from "lucide-react/dist/esm/icons/clock";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Send from "lucide-react/dist/esm/icons/send";
import Shield from "lucide-react/dist/esm/icons/shield";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Upload any document and our AI creates curriculum-aligned questions instantly.",
  },
  {
    icon: Send,
    title: "Telegram Integration",
    description: "Auto-post quizzes to your channel. Students answer directly in Telegram.",
  },
  {
    icon: FileText,
    title: "Instant Explanations",
    description: "Beautiful PDFs with detailed answers delivered automatically after each quiz.",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description: "Set up months of content in minutes. Timezone-aware, engagement-optimized.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track participation, identify weak topics, and measure student progress.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant with bank-level encryption. Your data stays protected.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to save time and increase student engagement.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group"
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mb-4 group-hover:bg-foreground transition-colors">
                <feature.icon className="w-5 h-5 text-foreground group-hover:text-background transition-colors" />
              </div>
              <h3 className="text-base font-semibold mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
