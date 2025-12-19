import { ArrowRight, BookOpen, Briefcase, Film, Gamepad2, Languages, Newspaper } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const useCases = [
  {
    icon: BookOpen,
    title: "JEE/NEET Coaching",
    description: "Auto-post daily quizzes to your Telegram channel. Keep 50K+ students engaged with zero manual work.",
    gradient: "from-primary to-accent"
  },
  {
    icon: Briefcase,
    title: "UPSC Preparation",
    description: "Schedule current affairs quizzes. Auto-generate PDFs with detailed explanations for your channel.",
    gradient: "from-accent to-secondary"
  },
  {
    icon: Languages,
    title: "Language Learning",
    description: "Run vocabulary and grammar quizzes on Telegram. Track student progress and engagement metrics.",
    gradient: "from-secondary to-success"
  },
  {
    icon: Newspaper,
    title: "Banking & SSC",
    description: "Post aptitude and reasoning quizzes daily. Build a loyal student community on Telegram.",
    gradient: "from-success to-primary"
  },
  {
    icon: Film,
    title: "CBSE/ICSE Classes",
    description: "Share chapter-wise quizzes on your Telegram channel. Parents love the engagement reports.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: Gamepad2,
    title: "General Knowledge",
    description: "Run daily GK quizzes on Telegram. Perfect for current affairs channels and quiz enthusiasts.",
    gradient: "from-accent to-success"
  }
];

export const UseCases = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section 
      id="use-cases" 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 relative border-t border-border/50"
    >
      <div className="max-w-7xl mx-auto">
        <div className={`text-center mb-20 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
            Built for educators
            <span className="text-gradient-primary"> across all sectors</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            From competitive exam coaching to corporate training, TelePost powers learning for everyone
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, idx) => (
            <div
              key={idx}
              className={`group relative p-8 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-glow-sm ${
                isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${idx * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

              <div className={`relative w-16 h-16 bg-gradient-to-br ${useCase.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all text-white`}>
                <useCase.icon className="w-8 h-8" />
              </div>

              <h3 className="relative text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{useCase.title}</h3>
              <p className="relative text-base text-muted-foreground mb-6 leading-relaxed">{useCase.description}</p>

              <div className="relative flex items-center text-sm text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
