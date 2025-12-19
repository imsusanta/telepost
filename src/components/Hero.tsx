import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { AnimatedCounter } from "./AnimatedCounter";
import { useInView } from "@/hooks/useInView";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  const { ref: statsRef } = useInView({ threshold: 0.3 });

  return (
    <section
      id="main-content"
      className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Primary gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] animate-pulse-soft" />
        
        {/* Secondary floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px] animate-float-slow" />
        
        {/* Floating particles */}
        <div className="absolute top-1/3 left-1/5 w-2 h-2 bg-primary/30 rounded-full animate-particle-1" />
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-secondary/40 rounded-full animate-particle-2" />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-accent/30 rounded-full animate-particle-3" />
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-primary/20 rounded-full animate-particle-4" />
        <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-secondary/30 rounded-full animate-particle-5" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        {/* Minimal badge with animation */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm text-xs text-muted-foreground mb-8 animate-fade-up opacity-0 [animation-fill-mode:forwards]">
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          <span>500+ institutes worldwide</span>
        </div>

        {/* Main Headline - Massive, clean with reveal animation */}
        <h1
          id="hero-heading"
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight leading-[1.1] mb-8 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:100ms]"
        >
          <span className="text-foreground">Transform how you</span>
          <br />
          <span className="text-gradient-primary relative">
            teach with AI
            <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-full animate-draw-line" />
          </span>
        </h1>

        {/* Subheadline - Shorter, impactful */}
        <p 
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-12 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:200ms]"
        >
          AI-powered quizzes. Telegram delivery. Zero busywork.
        </p>

        {/* CTA - Single primary with glow, text secondary */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:300ms]"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group h-14 px-10 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-glow"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
          >
            Watch demo
            <span className="inline-block ml-1 transition-transform group-hover:translate-x-0.5">→</span>
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full" />
          </button>
        </div>

        {/* Animated Stats - Horizontal */}
        <div 
          ref={statsRef as React.RefObject<HTMLDivElement>}
          className="flex items-center justify-center gap-8 sm:gap-16 text-center animate-fade-up opacity-0 [animation-fill-mode:forwards] [animation-delay:400ms]"
        >
          {[
            { value: 2000000, label: "Quizzes", suffix: "+" },
            { value: 50000, label: "Students", suffix: "+" },
            { value: 99.9, label: "Uptime", suffix: "%", decimals: 1 },
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className="group cursor-default"
              style={{ animationDelay: `${500 + index * 100}ms` }}
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground transition-transform group-hover:scale-110">
                <AnimatedCounter 
                  end={stat.value} 
                  suffix={stat.suffix} 
                  decimals={stat.decimals || 0}
                  duration={2500}
                />
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
