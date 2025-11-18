import { Sparkles, BarChart3, Send, CheckCircle2, Globe, Upload, Users, Award, TrendingUp } from "lucide-react";

const features = [
  {
    icon: <Upload className="w-6 h-6" />,
    title: "Knowledge Base Upload",
    description: "Upload PDFs, documents, presentations. AI extracts content and generates quizzes automatically.",
    gradient: "from-primary to-accent"
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Student Management",
    description: "Manage unlimited students, create batches, track attendance, and monitor progress in real-time.",
    gradient: "from-accent to-secondary"
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Advanced Analytics",
    description: "Deep insights into student performance, weak topics, batch comparisons, and predictive success rates.",
    gradient: "from-secondary to-success"
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Auto-Grading System",
    description: "Automated grading with detailed explanations, negative marking support, and instant feedback.",
    gradient: "from-success to-primary"
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "Live Competitions",
    description: "Host real-time quiz tournaments with leaderboards, gamification, and inter-batch challenges.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Parent Portal",
    description: "Real-time progress updates, automated reports, and direct parent-teacher communication.",
    gradient: "from-accent to-success"
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Question Bank",
    description: "Access 10,000+ pre-made questions across subjects, filtered by difficulty and exam type.",
    gradient: "from-secondary to-primary"
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "White-Label Solution",
    description: "Custom branding, domain, and remove our branding completely for your coaching institute.",
    gradient: "from-success to-accent"
  },
  {
    icon: <Send className="w-6 h-6" />,
    title: "LMS Integrations",
    description: "Seamlessly integrate with Moodle, Canvas, Google Classroom, and other learning platforms.",
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
