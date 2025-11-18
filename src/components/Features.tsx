import { Sparkles, BarChart3, FileText, CheckCircle2, Clock, Upload, Zap, Languages, Trophy } from "lucide-react";

const features = [
  {
    icon: <Upload className="w-6 h-6" />,
    title: "Knowledge Base Upload",
    description: "Upload PDFs, study notes, textbooks. AI generates high-quality quizzes from your content automatically.",
    gradient: "from-primary to-accent"
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Auto PDF Explanations",
    description: "After quiz ends, automatically generate & post a beautiful PDF with all answers and detailed explanations.",
    gradient: "from-accent to-secondary"
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Smart Scheduling",
    description: "Schedule quizzes daily/weekly with auto-posting. Set it once, run for months on autopilot.",
    gradient: "from-secondary to-success"
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Engagement Analytics",
    description: "Track views, participation rate, popular topics. Know what content resonates with your audience.",
    gradient: "from-success to-primary"
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Question Bank (50K+)",
    description: "Access pre-made questions for JEE, NEET, UPSC, etc. Filter by subject, difficulty, exam type.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: <Trophy className="w-6 h-6" />,
    title: "Leaderboards & Gamification",
    description: "Auto-generate weekly leaderboards. Award badges. Keep students engaged and coming back.",
    gradient: "from-accent to-success"
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Batch Quiz Generation",
    description: "Generate 30 quizzes from one document. Schedule entire month's content in 5 minutes.",
    gradient: "from-secondary to-primary"
  },
  {
    icon: <Languages className="w-6 h-6" />,
    title: "Multi-Language Support",
    description: "Create quizzes in Hindi, English, regional languages. AI translates questions instantly.",
    gradient: "from-success to-accent"
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Custom Branding",
    description: "Add your institute logo on PDFs, customize colors, add watermarks. Professional look guaranteed.",
    gradient: "from-primary to-success"
  }
];

export const Features = () => {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Everything You Need to
            <span className="block text-gradient bg-gradient-to-r from-primary via-accent to-secondary mt-2">
              Engage Your Audience
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for Telegram channel admins
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group clay-card-hover bg-card/50 backdrop-blur-sm p-6 animate-scale-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all text-white shadow-clay`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
