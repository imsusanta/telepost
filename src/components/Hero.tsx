import { Button } from "./ui/button";
import { ArrowRight, Send, Zap, Sparkles, FileText, Calendar, Clock, CheckCircle2 } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section
      id="main-content"
      className="relative min-h-[110vh] flex items-center justify-center pt-32 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="hero-heading"
    >

      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Primary gradient orb - Telegram blue tinted */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#0088cc]/5 rounded-full blur-[150px] animate-pulse-soft" />

        {/* Secondary floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-success/3 rounded-full blur-[80px] animate-float" />

        {/* Floating particles */}
        <div className="absolute top-1/3 left-[15%] w-2 h-2 bg-[#0088cc]/30 rounded-full animate-particle-1" />
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-secondary/40 rounded-full animate-particle-2" />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-accent/30 rounded-full animate-particle-3" />
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-[#0088cc]/20 rounded-full animate-particle-4" />
        <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-secondary/30 rounded-full animate-particle-5" />
        <div className="absolute top-[20%] right-[20%] w-2 h-2 bg-accent/25 rounded-full animate-particle-1" />
        <div className="absolute bottom-[20%] left-[20%] w-1.5 h-1.5 bg-[#0088cc]/35 rounded-full animate-particle-2" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0088cc]/30 bg-[#0088cc]/5 backdrop-blur-sm text-sm font-medium text-[#0088cc] mb-10 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <Send className="w-4 h-4" />
          <span>Telegram Automation for Educators</span>
        </div>

        {/* Main Headline */}
        <h1
          id="hero-heading"
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-display font-extrabold tracking-tight leading-[1.15] mb-6 text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]"
        >
          <span className="text-foreground block">Publish Up to 20 Telegram Quizzes</span>
          <span className="relative inline-block pb-2 mt-1">
            <span className="text-[#0088cc]">in Under a Minute</span>
            <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-[#0088cc] via-[#0088cc]/60 to-transparent rounded-full" />
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-14 leading-relaxed animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          <span className="text-foreground/90 font-medium">Save hours every week</span> by generating, scheduling, and automatically publishing exam-quality Telegram quizzes from <span className="text-foreground/90 font-medium">any topic or PDF</span>.
        </p>

        {/* CTA - Primary with Telegram styling */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms]"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group h-16 px-12 text-lg font-medium bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white hover:from-[#0077b5] hover:to-[#006699] rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(0,136,204,0.4)]"
          >
            <Send className="w-5 h-5 mr-2" />
            Start Free
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <button
            className="text-base text-muted-foreground hover:text-foreground transition-colors relative group flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-[#0088cc]" />
            <span>Watch Demo</span>
            <span className="inline-block ml-1 transition-transform group-hover:translate-x-0.5">→</span>
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full" />
          </button>
        </div>

        {/* Real Product Benefits & Features */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
          {[
            { title: "Under 30 Seconds", desc: "30-Second Workflow", icon: Clock },
            { title: "AI-Powered Generation", desc: "Exam-Quality MCQs", icon: Sparkles },
            { title: "PDF to Quiz", desc: "Instant Document Import", icon: FileText },
            { title: "Smart Scheduling", desc: "Auto Telegram Publishing", icon: Calendar },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-4 rounded-2xl bg-card/40 border border-border/50 backdrop-blur-sm hover:border-[#0088cc]/30 transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0088cc]/10 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <feature.icon className="w-5 h-5 text-[#0088cc]" />
              </div>
              <span className="text-sm font-bold text-foreground mb-0.5">{feature.title}</span>
              <span className="text-xs text-muted-foreground">{feature.desc}</span>
            </div>
          ))}
        </div>

        {/* Animated Telegram preview hint */}
        <div className="mt-16 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:500ms]">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Automatic Telegram Publishing</p>
              <p className="text-xs text-muted-foreground">Directly to your Telegram channel or group</p>
            </div>
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
