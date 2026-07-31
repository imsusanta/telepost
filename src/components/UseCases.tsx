import { ArrowRight, BookOpen, GraduationCap, School, Send, Target, Users } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const useCases = [
  {
    icon: School,
    title: "Coaching Institutes",
    description: "JEE, NEET & SSC academies automating daily test series and practice quizzes for 50K+ Telegram subscribers.",
    gradient: "from-primary to-accent"
  },
  {
    icon: GraduationCap,
    title: "Competitive Exam Educators",
    description: "Independent faculty creating PYQ-style daily quizzes for UPSC, Banking, State PCS, and Railway aspirants.",
    gradient: "from-accent to-secondary"
  },
  {
    icon: BookOpen,
    title: "School & Board Tutors",
    description: "CBSE & ICSE teachers delivering chapter-wise revision tests and daily practice questions to student groups.",
    gradient: "from-secondary to-success"
  },
  {
    icon: Send,
    title: "Telegram Education Channels",
    description: "Channel admins publishing automated daily GK, current affairs, and topic-wise quizzes to boost subscriber retention.",
    gradient: "from-success to-primary"
  },
  {
    icon: Target,
    title: "Subject Specialists",
    description: "Maths, Reasoning, English, and Science educators generating quick 30-second quizzes from notes and PDFs.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: Users,
    title: "Private Tuition & Batches",
    description: "Tutors managing multiple student batches on Telegram with scheduled automated quiz posts and instantly score checks.",
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
            Built for Coaching Institutes, Teachers & <span className="text-gradient-primary">Telegram Education Channels</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Empowering competitive exam educators, coaching centers, school teachers, and Telegram channel owners to automate exam-quality quizzes in seconds.
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
