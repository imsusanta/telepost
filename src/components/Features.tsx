import { Sparkles, Zap, BarChart3, Send, CheckCircle2, Globe } from "lucide-react";

const features = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI Quiz Generation",
    description: "Paste any content, get quiz questions instantly. Our AI understands context and creates engaging questions."
  },
  {
    icon: <Send className="w-6 h-6" />,
    title: "Telegram Native",
    description: "Perfect formatting for Telegram polls. Looks beautiful on mobile and desktop."
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Engagement Analytics",
    description: "Track quiz performance, participation rates, and subscriber engagement in real-time."
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Instant Publishing",
    description: "Direct integration with your Telegram channel. Post quizzes with one click."
  },
  {
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Question Types",
    description: "Multiple choice, true/false, polls, and custom quiz formats for variety."
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Multi-language",
    description: "Support for all languages. Create quizzes in any language your audience speaks."
  }
];

export const Features = () => {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Everything You Need to
            <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Engage Your Audience
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Powerful features designed specifically for Telegram channel admins
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
