import { Send, Zap, FileText, BarChart3, Database, Users } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const features = [
  {
    icon: Zap,
    title: "30-Second Quiz Posting",
    description: "From question to Telegram in just 30 seconds. The fastest automation experience in the industry.",
    highlight: true,
  },
  {
    icon: Send,
    title: "Native Telegram Experience",
    description: "Students answer directly in Telegram. Interactive polls with real-time feedback and results.",
  },
  {
    icon: FileText,
    title: "AI Question Generator",
    description: "Upload your PDF or paste text, get questions instantly. No more manual typing hassle.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "See who answered, track accuracy rates, all in real-time. Monitor student performance effortlessly.",
  },
  {
    icon: Database,
    title: "Smart Question Bank",
    description: "Organize questions by subject and topic. Create once, reuse forever across multiple quizzes.",
  },
  {
    icon: Users,
    title: "Multi-Channel Support",
    description: "Manage multiple Telegram channels from one dashboard. Perfect for coaching institutes and schools.",
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
        <div className={`text-center mb-20 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0088cc]/30 bg-[#0088cc]/5 text-sm text-[#0088cc] mb-6">
            <Zap className="w-4 h-4" />
            <span>Powerful Features</span>
          </div>
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6"
          >
            Everything You Need for
            <span className="text-gradient-primary"> Telegram Automation</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Save hours every week and skyrocket student engagement with powerful features
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`group relative p-8 rounded-3xl border transition-all duration-500 cursor-default overflow-hidden ${feature.highlight
                  ? "lg:col-span-2 lg:row-span-1 border-[#0088cc]/30 bg-gradient-to-br from-[#0088cc]/5 to-transparent"
                  : "border-border/50 bg-card/30"
                } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{
                transitionDelay: isInView ? `${idx * 100}ms` : "0ms"
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0088cc]/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Icon with glow */}
              <div className="relative mb-6">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl transition-colors ${feature.highlight
                    ? "bg-[#0088cc]/20 group-hover:bg-[#0088cc]/30"
                    : "bg-primary/10 group-hover:bg-primary/20"
                  }`}>
                  <feature.icon className={`w-7 h-7 ${feature.highlight ? "text-[#0088cc]" : "text-primary"}`} />
                </div>
                <div className={`absolute inset-0 w-14 h-14 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${feature.highlight ? "bg-[#0088cc]/20" : "bg-primary/20"
                  }`} />
              </div>

              <h3 className="relative text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="relative text-base text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Speed badge for highlighted feature */}
              {feature.highlight && (
                <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0088cc]/10 border border-[#0088cc]/20">
                  <span className="w-2 h-2 bg-[#0088cc] rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-[#0088cc]">Fastest in Industry</span>
                </div>
              )}

              {/* Subtle border glow on hover */}
              <div className={`absolute inset-0 rounded-3xl border transition-colors duration-500 ${feature.highlight
                  ? "border-[#0088cc]/0 group-hover:border-[#0088cc]/30"
                  : "border-primary/0 group-hover:border-primary/20"
                }`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
