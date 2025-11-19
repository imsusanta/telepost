import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import Film from "lucide-react/dist/esm/icons/film";
import Gamepad2 from "lucide-react/dist/esm/icons/gamepad-2";
import Languages from "lucide-react/dist/esm/icons/languages";
import Newspaper from "lucide-react/dist/esm/icons/newspaper";

const useCases = [
  {
    icon: <BookOpen className="w-8 h-8" />,
    title: "JEE/NEET Coaching",
    description: "Auto-post daily quizzes to your Telegram channel. Keep 50K+ students engaged with zero manual work.",
    gradient: "from-primary to-accent"
  },
  {
    icon: <Briefcase className="w-8 h-8" />,
    title: "UPSC Preparation",
    description: "Schedule current affairs quizzes. Auto-generate PDFs with detailed explanations for your channel.",
    gradient: "from-accent to-secondary"
  },
  {
    icon: <Languages className="w-8 h-8" />,
    title: "Language Learning",
    description: "Run vocabulary and grammar quizzes on Telegram. Track student progress and engagement.",
    gradient: "from-secondary to-success"
  },
  {
    icon: <Newspaper className="w-8 h-8" />,
    title: "Banking & SSC",
    description: "Post aptitude and reasoning quizzes daily. Build a loyal student community on Telegram.",
    gradient: "from-success to-primary"
  },
  {
    icon: <Film className="w-8 h-8" />,
    title: "CBSE/ICSE Classes",
    description: "Share chapter-wise quizzes on your Telegram channel. Parents love the engagement reports.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: <Gamepad2 className="w-8 h-8" />,
    title: "General Knowledge",
    description: "Run daily GK quizzes on Telegram. Perfect for current affairs channels and quiz enthusiasts.",
    gradient: "from-accent to-success"
  }
];

export const UseCases = () => {
  return (
    <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Trusted by Educators
            <span className="block text-gradient bg-gradient-to-r from-primary via-accent to-secondary mt-2">
              Across All Sectors
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From competitive exam coaching to corporate training, QuizGenie powers learning for everyone
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, idx) => (
            <div
              key={idx}
              className="group relative clay-card-hover bg-card/50 backdrop-blur-sm p-8 overflow-hidden animate-scale-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />

              <div className={`relative w-16 h-16 bg-gradient-to-br ${useCase.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all text-white shadow-clay`}>
                {useCase.icon}
              </div>

              <h3 className="relative text-xl font-bold mb-2 text-foreground">{useCase.title}</h3>
              <p className="relative text-muted-foreground mb-4">{useCase.description}</p>

              <div className="relative flex items-center text-sm text-primary font-semibold group-hover:gap-2 transition-all">
                Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
