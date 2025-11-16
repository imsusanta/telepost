import { Sparkles, CheckCircle2, Send, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">AI-Powered Quiz Generation</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-white">
              Create Viral
              <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Quiz Posts
              </span>
              for Your Telegram Channel in 30 Seconds
            </h1>

            <p className="text-xl text-gray-400 leading-relaxed">
              AI-powered quiz generator for Telegram admins. Boost engagement, grow followers, and keep your audience active.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="flex-1 px-8 py-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl font-semibold hover:shadow-xl hover:shadow-blue-500/50 transition-all flex items-center justify-center space-x-2 text-base"
              >
                <Sparkles className="w-5 h-5" />
                <span>Generate Quiz</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">50K+ quizzes created</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">4.9★ rating</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10">
              <div className="mx-auto w-full max-w-sm">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-3 shadow-2xl border border-white/10">
                  <div className="bg-slate-950 rounded-[2.5rem] overflow-hidden">
                    <div className="bg-slate-900 px-6 py-2 flex justify-between items-center text-xs text-white">
                      <span>9:41</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-3 bg-white/30 rounded-sm" />
                        <div className="w-4 h-3 bg-white/30 rounded-sm" />
                        <div className="w-4 h-3 bg-white/30 rounded-sm" />
                      </div>
                    </div>

                    <div className="bg-[#0088cc] px-4 py-3 flex items-center space-x-3 text-white">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold">Your Channel</div>
                        <div className="text-xs text-blue-100">50K subscribers</div>
                      </div>
                    </div>

                    <div className="p-4 space-y-4 h-[500px] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950">
                      <div className="bg-slate-800/50 rounded-2xl p-4 space-y-3 border border-white/5 text-white">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-blue-400">New Quiz</span>
                        </div>
                        
                        <h3 className="font-semibold text-lg">
                          🧠 Test Your Knowledge!
                        </h3>
                        
                        <p className="text-sm text-gray-400">
                          What is the capital of France?
                        </p>

                        <div className="space-y-2">
                          {['London', 'Paris', 'Berlin', 'Madrid'].map((option, idx) => (
                            <div
                              key={idx}
                              className={`px-4 py-3 rounded-xl border transition-all ${
                                idx === 1 
                                  ? 'bg-blue-500/20 border-blue-500/50' 
                                  : 'bg-slate-700/30 border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{option}</span>
                                {idx === 1 && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs text-blue-400">65%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                          <span>👁 2,543 views</span>
                          <span>📊 1,654 votes</span>
                        </div>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <BarChart3 className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-green-400">Engagement Up 320%</div>
                          <div className="text-xs text-gray-400 mt-1">Your quizzes are driving amazing engagement!</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};
