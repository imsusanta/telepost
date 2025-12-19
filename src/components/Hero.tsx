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
      className="relative min-h-screen flex items-center justify-center pt-24 pb-20 px-4 sm:px-6 lg:px-8"
      aria-labelledby="hero-heading"
    >
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Subtle gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        {/* Minimal badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-background/50 text-xs text-muted-foreground mb-8 animate-fade-up">
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          <span>500+ institutes worldwide</span>
        </div>

        {/* Main Headline - Massive, clean */}
        <h1
          id="hero-heading"
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight leading-[1.1] mb-8 animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          <span className="text-foreground">Transform how you</span>
          <br />
          <span className="text-gradient-primary">teach with AI</span>
        </h1>

        {/* Subheadline - Shorter, impactful */}
        <p 
          className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-12 animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          AI-powered quizzes. Telegram delivery. Zero busywork.
        </p>

        {/* CTA - Single primary, text secondary */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="h-12 px-8 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all duration-300"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Watch demo →
          </button>
        </div>

        {/* Inline stats - Horizontal */}
        <div 
          className="flex items-center justify-center gap-8 sm:gap-12 text-center animate-fade-up"
          style={{ animationDelay: "400ms" }}
        >
          {[
            { value: "2M+", label: "Quizzes" },
            { value: "50K+", label: "Students" },
            { value: "99.9%", label: "Uptime" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
