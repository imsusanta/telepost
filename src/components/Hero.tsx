import { Button } from "./ui/button";
import { ArrowRight, Send, Zap, Sparkles, FileText, Calendar, Clock, ShieldCheck } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section
      id="main-content"
      className="relative min-h-[105vh] flex items-center justify-center pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Animated gradient background & ambient dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Primary gradient orb - Telegram blue tinted */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#0088cc]/5 rounded-full blur-[150px] animate-pulse-soft" />

        {/* Floating particles */}
        <div className="absolute top-[22%] left-[10%] w-2 h-2 bg-[#0088cc]/40 rounded-full animate-particle-1" />
        <div className="absolute top-[18%] right-[12%] w-1.5 h-1.5 bg-[#0088cc]/30 rounded-full animate-particle-2" />
        <div className="absolute bottom-[35%] right-[8%] w-2 h-2 bg-[#0088cc]/35 rounded-full animate-particle-3" />
        <div className="absolute bottom-[28%] left-[8%] w-2 h-2 bg-[#0088cc]/30 rounded-full animate-particle-4" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#0088cc]/25 bg-[#0088cc]/8 backdrop-blur-sm text-sm font-medium text-[#0088cc] mb-8 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <Send className="w-4 h-4" />
          <span>Telegram Automation for Educators</span>
        </div>

        {/* Main Headline */}
        <h1
          id="hero-heading"
          className="text-3xl sm:text-5xl md:text-6xl lg:text-[3.6rem] font-display font-extrabold tracking-tight leading-[1.12] mb-6 text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]"
        >
          <span className="text-foreground block">Publish Up to 20 Telegram Quizzes</span>
          <span className="relative inline-block pb-3 mt-1">
            <span className="text-[#0088cc]">in under a minute</span>
            {/* Curved SVG Underline */}
            <svg
              className="absolute -bottom-1 left-0 w-full h-3 text-[#0088cc]"
              viewBox="0 0 250 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <path
                d="M3 9C60 3 180 2 247 9"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          Save hours every week by generating, scheduling, and automatically publishing exam-quality Telegram quizzes from <span className="text-foreground font-semibold">any topic or PDF</span>.
        </p>

        {/* Dual Pill CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms]"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group h-14 px-8 text-base font-semibold bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Start Free</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="group h-14 px-8 text-base font-semibold bg-card/80 backdrop-blur-sm text-foreground border border-border/80 hover:bg-muted/60 rounded-full transition-all duration-300 shadow-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-[#0088cc]" />
            <span>Watch Demo</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Sub-CTA Trust Micro Copy */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground mb-16 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:350ms]">
          <ShieldCheck className="w-4 h-4 text-[#0088cc]" />
          <span>No credit card required • Start free in under 2 minutes</span>
        </div>

        {/* 4 Feature Cards Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
          {[
            { title: "Under 30 Seconds", desc: "30-Second Workflow", icon: Clock },
            { title: "AI-Powered Generation", desc: "Exam-Quality MCQs", icon: Sparkles },
            { title: "PDF to Quiz", desc: "Instant Document Import", icon: FileText },
            { title: "Smart Scheduling", desc: "Auto Telegram Publishing", icon: Calendar },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-6 sm:p-7 rounded-3xl bg-card border border-border/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-[#0088cc]/30 transition-all duration-300 text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#0088cc]/10 flex items-center justify-center mb-5 text-[#0088cc] group-hover:scale-105 transition-transform">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-normal">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
