import { Sparkles, Send, FileText, BarChart3, Database, Users } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description: "Upload your documents and get curriculum-aligned questions in seconds. Our AI understands context, difficulty, and learning objectives.",
    highlight: true,
  },
  {
    icon: Send,
    title: "Telegram Delivery",
    description: "Auto-post quizzes to your channels on schedule. Students answer directly in Telegram with real-time feedback.",
  },
  {
    icon: FileText,
    title: "Instant PDF Reports",
    description: "Generate detailed explanation PDFs after each quiz. Perfect for revision and sharing with students.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Track student progress, identify weak topics, and get insights to improve your teaching.",
  },
  {
    icon: Database,
    title: "Question Bank",
    description: "Build and organize your question library. Tag, filter, and reuse questions across multiple quizzes.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite co-teachers and manage multiple channels. Perfect for coaching institutes and schools.",
  },
];

export const Features = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section 
      id="features" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 border-t border-border/50" 
      aria-labelledby="features-heading"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-20 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <h2 
            id="features-heading" 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6"
          >
            Everything you need to
            <span className="text-gradient-primary"> scale your teaching</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to save you hours every week and increase student engagement
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group relative p-8 rounded-3xl border border-border/50 bg-card/30 transition-all duration-500 cursor-default overflow-hidden ${
                feature.highlight ? "lg:col-span-2 lg:row-span-1" : ""
              } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ 
                transitionDelay: isInView ? `${idx * 100}ms` : "0ms"
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Icon with glow */}
              <div className="relative mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute inset-0 w-14 h-14 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              
              <h3 className="relative text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="relative text-base text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Learn more link */}
              <div className="relative mt-6 inline-flex items-center text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more
                <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </div>

              {/* Subtle border glow on hover */}
              <div className="absolute inset-0 rounded-3xl border border-primary/0 group-hover:border-primary/20 transition-colors duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
