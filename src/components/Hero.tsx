import { Button } from "./ui/button";
import { ArrowRight, Send, Zap, Sparkles, FileText, Calendar, Clock, CheckCircle2 } from "lucide-react";

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
      {/* Background Decorative Mesh & Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Fine SVG background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_15%,#000_60%,transparent_100%)]" />

        {/* Primary gradient orb - Telegram blue tinted */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0088cc]/10 rounded-full blur-[140px] animate-pulse-soft" />

        {/* Secondary subtle ambient lights */}
        <div className="absolute top-1/4 left-1/5 w-[450px] h-[450px] bg-primary/5 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/3 right-1/5 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] animate-float-slow" />

        {/* Floating subtle particles */}
        <div className="absolute top-1/3 left-[12%] w-2 h-2 bg-[#0088cc]/30 rounded-full animate-particle-1" />
        <div className="absolute top-1/2 right-[15%] w-1.5 h-1.5 bg-secondary/40 rounded-full animate-particle-2" />
        <div className="absolute bottom-1/3 left-[25%] w-1 h-1 bg-accent/30 rounded-full animate-particle-3" />
        <div className="absolute top-2/3 right-[30%] w-2 h-2 bg-[#0088cc]/20 rounded-full animate-particle-4" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#0088cc]/25 bg-[#0088cc]/[0.07] hover:bg-[#0088cc]/[0.12] hover:border-[#0088cc]/40 backdrop-blur-md text-xs sm:text-sm font-medium text-[#0088cc] shadow-[0_0_20px_rgba(0,136,204,0.12)] transition-all duration-300 mb-8 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <div className="w-6 h-6 rounded-full bg-[#0088cc]/15 flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-[#0088cc]" />
          </div>
          <span>Telegram Automation for Educators</span>
        </div>

        {/* Main Headline */}
        <h1
          id="hero-heading"
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-display font-extrabold tracking-tight leading-[1.15] mb-6 text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]"
        >
          <span className="text-foreground block">Publish Up to 20 Telegram Quizzes</span>
          <span className="relative inline-block pb-2 mt-1">
            <span className="text-[#0088cc]">in under a minute</span>
            <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-[#0088cc] via-[#0088cc]/70 to-transparent rounded-full shadow-[0_2px_10px_rgba(0,136,204,0.4)]" />
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          <span className="text-foreground/90 font-medium">Save hours every week</span> by generating, scheduling, and automatically publishing exam-quality Telegram quizzes from <span className="text-foreground/90 font-medium">any topic or PDF</span>.
        </p>

        {/* CTA Buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-16 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms]"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group h-14 sm:h-16 px-10 sm:px-12 text-base sm:text-lg font-semibold bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white hover:from-[#0077b5] hover:to-[#006699] rounded-full transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-[0_0_30px_rgba(0,136,204,0.35)] hover:shadow-[0_0_45px_rgba(0,136,204,0.55)]"
          >
            <Send className="w-5 h-5 mr-2.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            Start Free
            <ArrowRight className="w-5 h-5 ml-2.5 transition-transform group-hover:translate-x-1" />
          </Button>

          <button
            className="h-14 px-8 text-base font-medium text-muted-foreground hover:text-foreground bg-card/40 hover:bg-card/80 border border-border/60 hover:border-[#0088cc]/30 backdrop-blur-md rounded-full transition-all duration-300 group flex items-center gap-2.5 shadow-sm hover:shadow-md"
          >
            <Zap className="w-4 h-4 text-[#0088cc] transition-transform group-hover:scale-110" />
            <span>Watch Demo</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Premium Feature Cards */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 max-w-4xl mx-auto animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
          {[
            { title: "Under 30 Seconds", desc: "30-Second Workflow", icon: Clock },
            { title: "AI-Powered Generation", desc: "Exam-Quality MCQs", icon: Sparkles },
            { title: "PDF to Quiz", desc: "Instant Document Import", icon: FileText },
            { title: "Smart Scheduling", desc: "Auto Telegram Publishing", icon: Calendar },
          ].map((feature, i) => (
            <div
              key={i}
              className="group relative p-4 sm:p-5 rounded-2xl bg-card/40 border border-border/60 backdrop-blur-md hover:border-[#0088cc]/40 hover:bg-card/75 hover:shadow-[0_10px_30px_-10px_rgba(0,136,204,0.15)] transition-all duration-300 hover:-translate-y-1 text-center flex flex-col items-center"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0088cc]/15 to-[#0088cc]/5 border border-[#0088cc]/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-[#0088cc]/40 transition-all duration-300 text-[#0088cc]">
                <feature.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-foreground mb-0.5 group-hover:text-[#0088cc] transition-colors">{feature.title}</span>
              <span className="text-xs text-muted-foreground">{feature.desc}</span>
            </div>
          ))}
        </div>

        {/* Live Telegram Status Indicator */}
        <div className="mt-14 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:500ms]">
          <div className="inline-flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-md shadow-md hover:border-[#0088cc]/30 transition-all duration-300 group">
            <div className="w-9 h-9 rounded-xl bg-[#0088cc] flex items-center justify-center shadow-[0_0_15px_rgba(0,136,204,0.4)] group-hover:scale-105 transition-transform">
              <Send className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Automatic Telegram Publishing</p>
              <p className="text-xs text-muted-foreground">Directly to your Telegram channel or group</p>
            </div>
            <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse ml-1" />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
