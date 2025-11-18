import { Sparkles, Zap, BarChart3, Send, CheckCircle2, Globe } from "lucide-react";

const features = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI Quiz Generation",
    description: "Paste any content, get quiz questions instantly. Our AI understands context and creates engaging questions.",
    gradient: "from-primary to-accent"
  },
  {
    icon: <Send className="w-6 h-6" />,
    title: "Telegram Native",
    description: "Perfect formatting for Telegram polls. Looks beautiful on mobile and desktop.",
    gradient: "from-accent to-secondary"
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Engagement Analytics",
    description: "Track quiz performance, participation rates, and subscriber engagement in real-time.",
    gradient: "from-secondary to-success"
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Publishing",
    description: "Direct integration with your Telegram channel. Post quizzes with one click.",
    gradient: "from-success to-primary"
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Question Types",
    description: "Multiple choice, true/false, polls, and custom quiz formats for variety.",
    gradient: "from-primary to-secondary"
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Multi-language",
    description: "Support for all languages. Create quizzes in any language your audience speaks.",
    gradient: "from-accent to-success"
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
