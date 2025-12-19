import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

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
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Primary gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] animate-pulse-soft" />
        
        {/* Secondary floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] bg-success/3 rounded-full blur-[80px] animate-float" />
        
        {/* Floating particles - More of them */}
        <div className="absolute top-1/3 left-[15%] w-2 h-2 bg-primary/30 rounded-full animate-particle-1" />
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-secondary/40 rounded-full animate-particle-2" />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-accent/30 rounded-full animate-particle-3" />
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-primary/20 rounded-full animate-particle-4" />
        <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-secondary/30 rounded-full animate-particle-5" />
        <div className="absolute top-[20%] right-[20%] w-2 h-2 bg-accent/25 rounded-full animate-particle-1" />
        <div className="absolute bottom-[20%] left-[20%] w-1.5 h-1.5 bg-primary/35 rounded-full animate-particle-2" />
        <div className="absolute top-[40%] left-[10%] w-1 h-1 bg-success/30 rounded-full animate-particle-3" />
        <div className="absolute bottom-[40%] right-[10%] w-2 h-2 bg-secondary/25 rounded-full animate-particle-4" />
        <div className="absolute top-[60%] left-[40%] w-1.5 h-1.5 bg-accent/20 rounded-full animate-particle-5" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        {/* Minimal badge with animation */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm text-sm text-muted-foreground mb-10 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span>Trusted by 500+ institutes worldwide</span>
        </div>

        {/* Main Headline - Massive, clean with reveal animation */}
        <h1
          id="hero-heading"
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-display font-bold tracking-tight leading-[1.05] mb-10 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]"
        >
          <span className="text-foreground">Transform how you</span>
          <br />
          <span className="text-gradient-primary relative">
            teach with AI
            <span className="absolute -bottom-2 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-secondary rounded-full animate-draw-line" />
          </span>
        </h1>

        {/* Subheadline - Shorter, impactful */}
        <p 
          className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-14 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          AI-powered quizzes. Telegram delivery. Zero busywork.
          <br className="hidden sm:block" />
          <span className="text-foreground/80">Engage millions of students effortlessly.</span>
        </p>

        {/* CTA - Single primary with glow, text secondary */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms]"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group h-16 px-12 text-lg font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-glow"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <button
            className="text-base text-muted-foreground hover:text-foreground transition-colors relative group"
          >
            Watch 2-min demo
            <span className="inline-block ml-1 transition-transform group-hover:translate-x-0.5">→</span>
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full" />
          </button>
        </div>

        {/* Quick stats preview */}
        <div 
          className="flex items-center justify-center gap-12 sm:gap-20 text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
        {[
            { value: "2M+", label: "Quizzes created" },
            { value: "500K+", label: "Students engaged" },
            { value: "4.9/5", label: "Average rating" },
          ].map((stat) => (
            <div 
              key={stat.label} 
              className="group cursor-default"
            >
              <div className="text-2xl sm:text-3xl font-display font-bold text-foreground transition-transform group-hover:scale-110">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
