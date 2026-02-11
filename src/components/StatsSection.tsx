import { AnimatedCounter } from "./AnimatedCounter";
import { useInView } from "@/hooks/useInView";
import { Users, BookOpen, Zap } from "lucide-react";

const stats = [
  {
    icon: BookOpen,
    value: 2000000,
    suffix: "+",
    label: "Quizzes Created",
    description: "And counting every day",
  },
  {
    icon: Users,
    value: 500000,
    suffix: "+",
    label: "Students Engaged",
    description: "Across all channels",
  },
  {
    icon: Zap,
    value: 99.9,
    suffix: "%",
    label: "Uptime",
    description: "Enterprise reliability",
    decimals: 1,
  },
];

export const StatsSection = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.05),_transparent_70%)]" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-20 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-4">
            Trusted by educators
            <span className="text-gradient-primary"> worldwide</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of educators who have transformed their teaching with
            AI-powered quizzes
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className={`group relative text-center p-8 rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 transition-all duration-500 hover:border-primary/30 hover:shadow-glow-sm ${isInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
                }`}
              style={{ transitionDelay: `${idx * 100 + 200}ms` }}
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>

              {/* Value */}
              <div className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-2">
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals || 0}
                  duration={2500}
                />
              </div>

              {/* Label */}
              <div className="text-lg font-semibold text-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
