import { BookOpen, Newspaper, Gamepad2, Briefcase, Film, Trophy, ArrowRight } from "lucide-react";

const useCases = [
  {
    icon: <BookOpen className="w-8 h-8" />,
    title: "Education Channels",
    description: "Test student knowledge",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: <Newspaper className="w-8 h-8" />,
    title: "News Channels",
    description: "Current affairs quizzes",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: <Gamepad2 className="w-8 h-8" />,
    title: "Gaming Communities",
    description: "Trivia contests",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: <Briefcase className="w-8 h-8" />,
    title: "Business Channels",
    description: "Lead generation",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: <Film className="w-8 h-8" />,
    title: "Entertainment",
    description: "Movie/TV show quizzes",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    icon: <Trophy className="w-8 h-8" />,
    title: "Contests",
    description: "Prize giveaways",
    gradient: "from-yellow-500 to-orange-500"
  }
];

export const UseCases = () => {
  return (
    <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Perfect for Every
            <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Type of Channel
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            From education to entertainment, QuizGenie works for all Telegram communities
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, idx) => (
            <div
              key={idx}
              className="group relative p-8 bg-slate-900/50 border border-white/10 rounded-2xl hover:border-white/20 transition-all duration-300 overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
              
              <div className={`w-16 h-16 bg-gradient-to-br ${useCase.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white`}>
                {useCase.icon}
              </div>
              
              <h3 className="text-xl font-semibold mb-2 text-white">{useCase.title}</h3>
              <p className="text-gray-400 mb-4">{useCase.description}</p>
              
              <div className="flex items-center text-sm text-blue-400 font-medium">
                Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
