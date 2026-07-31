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

        {/* Subtle background wave curves from screenshot */}
        <div className="absolute left-0 top-[20%] w-[45%] h-[500px] opacity-15 pointer-events-none text-[#0088cc]">
          <svg className="w-full h-full" viewBox="0 0 500 500" fill="none">
            <path d="M -100 200 Q 150 350 450 150 M -100 240 Q 150 390 450 190 M -100 280 Q 150 430 450 230" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="absolute right-0 top-[20%] w-[45%] h-[500px] opacity-15 pointer-events-none text-[#0088cc]">
          <svg className="w-full h-full" viewBox="0 0 500 500" fill="none">
            <path d="M 50 150 Q 350 350 600 200 M 50 190 Q 350 390 600 240 M 50 230 Q 350 430 600 280" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Scattered background dots */}
        <div className="absolute top-[18%] left-[10%] w-2 h-2 rounded-full bg-[#0088cc]/40" />
        <div className="absolute top-[22%] right-[8%] w-2 h-2 rounded-full bg-purple-400/40" />
        <div className="absolute top-[40%] right-[15%] w-1.5 h-1.5 rounded-full bg-purple-400/40" />
        <div className="absolute bottom-[35%] left-[6%] w-1.5 h-1.5 rounded-full bg-[#0088cc]/30" />

        {/* Left Side: 3D Paperplane + Dashed Trail */}
        <div className="hidden lg:block absolute left-[6%] top-[24%] pointer-events-none">
          <svg className="w-48 h-48 opacity-30 text-[#0088cc]" viewBox="0 0 200 200" fill="none">
            <path d="M 20 180 C 10 90, 90 40, 110 100 C 130 160, 50 160, 60 110 C 70 60, 140 30, 180 20" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" fill="none" />
          </svg>
          <div className="absolute top-0 right-0 -translate-y-2 translate-x-2 text-[#0088cc] drop-shadow-lg animate-float">
            <Send className="w-10 h-10 fill-[#0088cc] -rotate-12" />
          </div>
        </div>

        {/* Right Side: Telegram Badge + Dashed Trail */}
        <div className="hidden lg:block absolute right-[8%] top-[38%] pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#0088cc] to-[#0077b5] shadow-lg shadow-[#0088cc]/30 flex items-center justify-center text-white mb-2 animate-float-slow">
            <Send className="w-7 h-7 fill-white ml-[-2px] mt-[1px]" />
          </div>
          <svg className="w-48 h-48 opacity-30 text-[#0088cc] ml-[-40px]" viewBox="0 0 200 200" fill="none">
            <path d="M 40 20 C 110 40, 160 100, 120 150 C 90 180, 50 130, 100 110 C 140 90, 170 150, 180 180" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" fill="none" />
          </svg>
        </div>
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
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground tracking-tight leading-[1.12] mb-6 text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]"
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

        {/* Subheadline */}
        <p
          className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-9 leading-relaxed animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          Save hours every week by generating, scheduling,
          <br className="hidden sm:block" />
          and automatically publishing <span className="font-bold text-foreground">exam-quality</span> Telegram quizzes.
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

        {/* 4 Feature Cards matching screenshot circular badges */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto text-left animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
          {/* Card 1: 30-Second Workflow */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-md hover:border-[#0088cc]/30 transition-all flex flex-col justify-between group min-h-[185px]">
            <div>
              <div className="w-16 h-16 rounded-full bg-blue-100/80 dark:bg-blue-950/40 text-[#0088cc] flex items-center justify-center mb-4">
                <Timer className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">30-Second Workflow</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Create and publish quizzes in just 30 seconds.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-center text-[#0088cc] group-hover:scale-110 transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: AI Quiz Generation */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all flex flex-col justify-between group min-h-[185px]">
            <div>
              <div className="w-16 h-16 rounded-full bg-purple-100/80 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Brain className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">AI Quiz Generation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">AI creates exam-quality MCQs in seconds.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 3: PDF to Quiz */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-md hover:border-pink-500/30 transition-all flex flex-col justify-between group min-h-[185px]">
            <div>
              <div className="w-16 h-16 rounded-full bg-pink-100/80 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4 relative">
                <FileText className="w-8 h-8" />
                <span className="absolute bottom-2 right-2 bg-pink-600 text-white text-[7px] font-extrabold px-1 rounded">PDF</span>
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">PDF to Quiz</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Convert any PDF or notes into quizzes instantly.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full bg-pink-50 dark:bg-pink-950/60 border border-pink-200/60 dark:border-pink-800/40 flex items-center justify-center text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 4: Smart Scheduling */}
          <div className="p-6 rounded-3xl bg-card/90 backdrop-blur-md border border-border/60 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all flex flex-col justify-between group min-h-[185px]">
            <div>
              <div className="w-16 h-16 rounded-full bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">Smart Scheduling</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Schedule quizzes and auto publish to Telegram.</p>
            </div>
            <div className="flex justify-end mt-4">
              <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
