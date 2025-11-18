import { Sparkles, CheckCircle2, Send, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center space-x-2 px-5 py-2.5 bg-primary/10 clay-card">
              <Sparkles className="w-4 h-4 text-primary animate-pulse-soft" />
              <span className="text-sm text-primary font-semibold">AI-Powered Telegram Quiz Generator</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-foreground">
              Run Your Entire
              <span className="block text-gradient bg-gradient-to-r from-primary via-accent to-secondary mt-2">
                Quiz Channel
              </span>
              on Autopilot with AI
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed">
              Upload PDFs → AI generates quizzes → Auto-posts to Telegram → Sends explanation PDFs. Your coaching institute's Telegram channel runs 24/7 without lifting a finger.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="clay-button px-8 py-6 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-2xl font-semibold flex items-center justify-center space-x-2 text-base"
              >
                <Sparkles className="w-5 h-5" />
                <span>Generate Quiz</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center space-x-2">
                <div className="clay-card bg-success/20 p-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                </div>
                <span className="text-sm text-foreground font-medium">Save 15+ hours/week</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="clay-card bg-success/20 p-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                </div>
                <span className="text-sm text-foreground font-medium">800+ coaching institutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="clay-card bg-success/20 p-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                </div>
                <span className="text-sm text-foreground font-medium">95% retention rate</span>
              </div>
            </div>
          </div>

          <div className="relative animate-float">
            <div className="relative z-10">
              <div className="mx-auto w-full max-w-sm">
                <div className="clay-card-hover bg-gradient-to-br from-card to-card/80 rounded-[3rem] p-4 backdrop-blur-sm">
                  <div className="bg-background/80 rounded-[2.5rem] overflow-hidden shadow-clay-inner">
                    <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-6 py-2 flex justify-between items-center text-xs text-foreground">
                      <span className="font-semibold">9:41</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-3 bg-primary/30 rounded-sm clay-card" />
                        <div className="w-4 h-3 bg-accent/30 rounded-sm clay-card" />
                        <div className="w-4 h-3 bg-secondary/30 rounded-sm clay-card" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-primary to-accent px-4 py-3 flex items-center space-x-3 text-primary-foreground">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center clay-card">
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold">Your Channel</div>
                        <div className="text-xs opacity-90">50K subscribers</div>
                      </div>
                    </div>

                    <div className="p-4 space-y-4 h-[500px] overflow-y-auto bg-gradient-to-b from-background/95 to-card">
                      <div className="clay-card bg-card/80 backdrop-blur-sm p-4 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-primary animate-pulse-soft" />
                          <span className="text-sm font-semibold text-primary">New Quiz</span>
                        </div>

                        <h3 className="font-bold text-lg text-foreground">
                          🧠 Test Your Knowledge!
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          What is the capital of France?
                        </p>

                        <div className="space-y-2">
                          {['London', 'Paris', 'Berlin', 'Madrid'].map((option, idx) => (
                            <div
                              key={idx}
                              className={`px-4 py-3 rounded-xl transition-all ${
                                idx === 1
                                  ? 'clay-card bg-primary/20 border-2 border-primary/30'
                                  : 'clay-card bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">{option}</span>
                                {idx === 1 && (
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                    <span className="text-xs text-primary font-semibold">65%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 font-medium">
                          <span>👁 2,543 views</span>
                          <span>📊 1,654 votes</span>
                        </div>
                      </div>

                      <div className="clay-card bg-success/10 backdrop-blur-sm p-4 flex items-start space-x-3">
                        <div className="w-8 h-8 clay-card bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <BarChart3 className="w-4 h-4 text-success-foreground" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-success-foreground">Engagement Up 320%</div>
                          <div className="text-xs text-muted-foreground mt-1">Your quizzes are driving amazing engagement!</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse-soft" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl animate-pulse-soft" />
          </div>
        </div>
      </div>
    </section>
  );
};
