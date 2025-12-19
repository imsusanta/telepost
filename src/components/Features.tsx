import { Sparkles, Send, FileText, BarChart3 } from "lucide-react";

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
  return (
    <section 
      id="features" 
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50" 
      aria-labelledby="features-heading"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 
            id="features-heading" 
            className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4"
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
              className={`group p-8 rounded-2xl border border-border/50 bg-card/30 hover:bg-card/50 transition-all duration-300 ${
                idx === 0 ? "sm:col-span-2" : ""
              }`}
            >
              <feature.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
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
