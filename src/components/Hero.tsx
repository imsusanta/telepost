import { ArrowRight, Play, CheckCircle2, Star, Users, TrendingUp, Zap } from "lucide-react";
import { Button } from "./ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Premium gradient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-primary/30 via-accent/20 to-transparent rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-secondary/30 via-accent/20 to-transparent rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 via-transparent to-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center max-w-5xl mx-auto">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/60 backdrop-blur-sm clay-card mb-8 animate-slide-up">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br ${
                  i === 1 ? 'from-primary to-accent' :
                  i === 2 ? 'from-secondary to-accent' :
                  i === 3 ? 'from-accent to-primary' :
                  'from-success to-secondary'
                }`} />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">Trusted by 500+ coaching institutes</span>
            <div className="flex items-center gap-0.5 ml-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight text-foreground animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Your Telegram Channel
            <span className="block text-gradient bg-gradient-to-r from-primary via-accent to-secondary py-2">
              Runs Itself
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-8 text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            The AI-powered platform that transforms your study materials into engaging quizzes, auto-posts them to Telegram, and delivers detailed explanations — all while you sleep.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Button
              onClick={onGetStarted}
              size="lg"
              className="clay-button group px-8 py-7 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-2xl font-semibold text-lg w-full sm:w-auto"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="clay-button px-8 py-7 bg-card/50 hover:bg-card border-border rounded-2xl font-semibold text-lg w-full sm:w-auto"
            >
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* Social proof stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: Users, value: '50K+', label: 'Active Students', color: 'text-primary' },
              { icon: TrendingUp, value: '2M+', label: 'Quizzes Delivered', color: 'text-accent' },
              { icon: Zap, value: '98%', label: 'Engagement Rate', color: 'text-secondary' },
              { icon: CheckCircle2, value: '15hrs', label: 'Saved Weekly', color: 'text-success' },
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center p-4">
                <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
                <div className="text-3xl sm:text-4xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* App preview mockup */}
        <div className="mt-20 relative animate-scale-in" style={{ animationDelay: '0.5s' }}>
          <div className="relative mx-auto max-w-5xl">
            {/* Glow effect behind mockup */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 blur-3xl scale-95" />

            {/* Main mockup container */}
            <div className="relative clay-card-hover bg-card/80 backdrop-blur-sm rounded-3xl p-3 sm:p-4">
              <div className="bg-gradient-to-br from-background to-card rounded-2xl overflow-hidden shadow-clay-inner">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="clay-card bg-muted/50 rounded-lg px-4 py-1.5 text-xs text-muted-foreground max-w-md mx-auto">
                      quizgenie.app/dashboard
                    </div>
                  </div>
                </div>

                {/* Dashboard preview */}
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Quizzes Today', value: '12', trend: '+24%' },
                      { label: 'Engagement', value: '94%', trend: '+12%' },
                      { label: 'New Subs', value: '847', trend: '+18%' },
                    ].map((stat, idx) => (
                      <div key={idx} className="clay-card bg-card/50 p-4 text-center">
                        <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        <div className="text-xs text-green-500 font-medium">{stat.trend}</div>
                      </div>
                    ))}
                  </div>

                  {/* Activity visualization */}
                  <div className="clay-card bg-card/50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-foreground">Weekly Activity</span>
                      <span className="text-xs text-muted-foreground">Last 7 days</span>
                    </div>
                    <div className="flex items-end justify-between gap-2 h-24">
                      {[40, 65, 45, 80, 55, 90, 70].map((height, idx) => (
                        <div
                          key={idx}
                          className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t-lg transition-all hover:opacity-80"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
