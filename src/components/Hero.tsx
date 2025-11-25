import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section
      id="main-content"
      className="relative min-h-screen flex items-center justify-center pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/8 via-accent/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-secondary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative text-center">
        {/* Main headline */}
        <h1
          id="hero-heading"
          className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-foreground animate-slide-up"
        >
          Create quizzes.
          <span className="block text-gradient bg-gradient-to-r from-primary to-accent py-2">
            Automatically.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-8 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Transform your study materials into engaging quizzes with AI.
          Auto-post to Telegram and deliver instant explanations.
        </p>

        {/* Invitation-only badge */}
        <div className="mt-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Invitation-Only Access
          </span>
        </div>

        {/* CTA button */}
        <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group px-8 py-6 bg-foreground hover:bg-foreground/90 text-background rounded-full font-medium text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
            aria-label="Sign in to TelePost"
          >
            Sign in with invitation code
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Button>
          <p className="mt-3 text-sm text-muted-foreground">
            Free tier includes 1 Telegram channel • 10 quizzes per month
          </p>
        </div>

        {/* Simple stats */}
        <div
          className="mt-20 flex items-center justify-center gap-12 sm:gap-16 animate-slide-up"
          style={{ animationDelay: '0.3s' }}
          role="region"
          aria-label="Platform statistics"
        >
          {[
            { value: '50K+', label: 'Students', description: 'Over 50,000 students using TelePost' },
            { value: '2M+', label: 'Quizzes', description: 'More than 2 million quizzes created' },
            { value: '500+', label: 'Institutes', description: 'Over 500 educational institutes partnered' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-foreground" aria-label={stat.description}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1" aria-hidden="true">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
