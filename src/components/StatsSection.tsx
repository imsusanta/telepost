import { BookOpen, Send, Calendar } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const stats = [
  {
    icon: BookOpen,
    title: "AI quizzes from your material",
    description: "Turn a topic or PDF into exam-style MCQs you can edit before posting.",
  },
  {
    icon: Send,
    title: "Post to Telegram",
    description: "Send quizzes and messages to channels you connect with your own bot.",
  },
  {
    icon: Calendar,
    title: "Schedule in advance",
    description: "Queue daily quizzes so your channel stays active without manual posting.",
  },
];

export const StatsSection = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.05),_transparent_70%)]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div
          className={`text-center mb-20 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-4">
            What TelePost
            <span className="text-gradient-primary"> actually does</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A workspace for educators who already teach on Telegram — not a claim about millions of users.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, idx) => (
            <div
              key={stat.title}
              className={`group relative text-center p-8 rounded-3xl bg-card/50 backdrop-blur-sm border border-border/50 transition-all duration-500 hover:border-primary/30 hover:shadow-glow-sm ${isInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
                }`}
              style={{ transitionDelay: `${idx * 100 + 200}ms` }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                {stat.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
