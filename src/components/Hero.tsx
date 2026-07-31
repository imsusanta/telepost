import { Button } from "./ui/button";
import { ArrowRight, Send, Zap, ShieldCheck, Timer, Brain, FileText, Calendar, ChevronRight } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section
      id="main-content"
      className="relative min-h-[100vh] flex flex-col items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-background via-background/95 to-background"
      aria-labelledby="hero-heading"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Soft background ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#0088cc]/5 rounded-full blur-[140px]" />

        {/* Scattered background dots from screenshot */}
        <div className="absolute top-[18%] left-[10%] w-2 h-2 rounded-full bg-[#0088cc]/40" />
        <div className="absolute top-[22%] right-[10%] w-2 h-2 rounded-full bg-secondary/40" />
        <div className="absolute top-[42%] right-[18%] w-1.5 h-1.5 rounded-full bg-purple-400/40" />
        <div className="absolute top-[40%] left-[11%] w-1.5 h-1.5 rounded-full bg-[#0088cc]/30" />




      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center w-full">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0088cc]/30 bg-[#0088cc]/5 backdrop-blur-sm text-xs sm:text-sm font-semibold text-[#0088cc] mb-8 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <Send className="w-3.5 h-3.5 fill-[#0088cc]" />
          <span>Telegram Automation for Educators</span>
        </div>

        {/* Main Headline */}
        <h1
          id="hero-heading"
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-[1.15] mb-6 text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]"
        >
          <span className="block text-foreground">Publish Up to 20 Telegram Quizzes</span>
          <span className="relative inline-block pb-3 mt-1 text-[#0088cc]">
            in under a minute
            {/* Multi-color gradient swoosh underline from screenshot */}
            <svg className="absolute -bottom-1 left-0 w-full h-3.5" viewBox="0 0 320 14" fill="none" preserveAspectRatio="none">
              <path d="M 4 10 C 80 3, 240 2, 316 10" stroke="url(#swoosh-gradient)" strokeWidth="4" strokeLinecap="round" />
              <defs>
                <linearGradient id="swoosh-gradient" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0088cc" />
                  <stop offset="0.5" stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>

        {/* Subheadline - Exactly 2 lines */}
        <p
          className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto mb-9 leading-relaxed text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          Save hours every week by generating, scheduling,
          <br className="hidden sm:block" />
          and automatically publishing exam-quality Telegram quizzes from <span className="font-bold text-foreground">any topic or PDF.</span>
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms]"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-[#0088cc] to-[#0077b5] hover:from-[#0077b5] hover:to-[#006699] text-white rounded-full transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#0088cc]/25 flex items-center gap-2"
          >
            <Send className="w-4 h-4 fill-white" />
            Start Free
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              const demoSection = document.getElementById("demo");
              if (demoSection) {
                demoSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="h-14 px-8 text-base font-semibold bg-card hover:bg-muted/50 border border-border/80 text-foreground rounded-full transition-all duration-300 hover:scale-[1.02] shadow-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-[#0088cc] fill-[#0088cc]" />
            Watch Demo
            <ArrowRight className="w-4 h-4 ml-1 text-muted-foreground" />
          </Button>
        </div>

        {/* Trust sub-text */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground mb-16 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:350ms]">
          <ShieldCheck className="w-4 h-4 text-[#0088cc]" />
          <span>No credit card required • Start free in under 2 minutes</span>
        </div>

        {/* 4 Feature Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto text-left animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-md hover:border-[#0088cc]/30 transition-all flex flex-col justify-between group min-h-[170px]">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center mb-4">
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">30-Second Workflow</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Create and publish quizzes in just 30 seconds.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-[#0088cc] group-hover:text-[#0088cc] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-md hover:border-[#0088cc]/30 transition-all flex flex-col justify-between group min-h-[170px]">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">AI Quiz Generation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">AI creates exam-quality MCQs in seconds.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-[#0088cc] group-hover:text-[#0088cc] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-md hover:border-[#0088cc]/30 transition-all flex flex-col justify-between group min-h-[170px]">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4 relative">
                <FileText className="w-6 h-6" />
                <span className="absolute bottom-1 right-1 bg-pink-500 text-white text-[8px] font-extrabold px-1 rounded">PDF</span>
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">PDF to Quiz</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Convert any PDF or notes into quizzes instantly.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-[#0088cc] group-hover:text-[#0088cc] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-md hover:border-[#0088cc]/30 transition-all flex flex-col justify-between group min-h-[170px]">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">Smart Scheduling</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Schedule quizzes and auto publish to Telegram.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-[#0088cc] group-hover:text-[#0088cc] transition-colors">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
