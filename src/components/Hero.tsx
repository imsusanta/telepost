import { Button } from "./ui/button";
import { ArrowRight, Play, Sparkles, Zap, Users, BookOpen } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section
      id="main-content"
      className="relative min-h-screen flex items-center justify-center pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Main gradient spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-hero-glow opacity-60" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] animate-blob delay-200" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-accent/15 rounded-full blur-[100px] animate-blob delay-500" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 noise opacity-50" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Badge */}
        <div className="flex justify-center mb-8 animate-fade-up">
          <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-muted-foreground">Trusted by</span>
            <span className="text-foreground font-semibold">500+ Institutes</span>
            <span className="text-muted-foreground">worldwide</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center">
          <h1
            id="hero-heading"
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight leading-[0.9] animate-fade-up delay-100"
          >
            <span className="text-gradient-white">Transform</span>
            <br />
            <span className="text-gradient-primary">Education</span>
            <br />
            <span className="text-gradient-white">with AI</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-8 text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-up delay-200">
            The complete platform for coaching institutes. 
            <span className="text-foreground"> AI-powered quizzes, </span>
            automated Telegram delivery, and 
            <span className="text-foreground"> smart student management.</span>
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 animate-fade-up delay-300">
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group relative h-14 px-8 text-lg font-semibold btn-primary-gradient rounded-full text-white shadow-glow-lg hover:shadow-glow-xl transition-all duration-500"
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="h-14 px-8 text-lg font-medium rounded-full glass-button"
          >
            <Play className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-up delay-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>No credit card required</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" />
            <span>Setup in 5 minutes</span>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up delay-500">
          {[
            { 
              value: '2M+', 
              label: 'Quizzes Generated',
              icon: BookOpen,
              color: 'primary'
            },
            { 
              value: '50K+', 
              label: 'Active Students',
              icon: Users,
              color: 'secondary'
            },
            { 
              value: '99.9%', 
              label: 'Uptime',
              icon: Zap,
              color: 'success'
            },
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="glass-card p-6 text-center card-hover group"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-${stat.color}/10`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
              <div className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-2 counter">
                {stat.value}
              </div>
              <div className="text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Floating Elements */}
        <div className="hidden lg:block">
          {/* Code snippet card */}
          <div className="absolute -left-20 top-1/3 glass-card p-4 w-64 animate-float-slow opacity-80">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-accent/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <code className="text-xs text-muted-foreground">
              <span className="text-secondary">const</span> quiz = <span className="text-primary">await</span> ai.generate()
            </code>
          </div>

          {/* Stats card */}
          <div className="absolute -right-16 top-1/2 glass-card p-4 animate-float opacity-80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">+127%</div>
                <div className="text-xs text-muted-foreground">Engagement</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
