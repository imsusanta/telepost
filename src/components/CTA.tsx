import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface CTAProps {
  onGetStarted: () => void;
}

export const CTA = ({ onGetStarted }: CTAProps) => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <div className="clay-card bg-card/80 backdrop-blur-sm p-8 md:p-12 lg:p-16 text-center animate-scale-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 clay-card mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Start Free Today</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Ready to Transform Your
            <span className="block text-gradient bg-gradient-to-r from-primary via-accent to-secondary mt-2">
              Telegram Channel?
            </span>
          </h2>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Join 500+ coaching institutes already using QuizGenie to engage their students and grow their channels on autopilot.
          </p>

          {/* Benefits list */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {[
              "14-day free trial",
              "No credit card required",
              "Cancel anytime",
              "24/7 support",
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={onGetStarted}
            size="lg"
            className="clay-button group px-10 py-7 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-2xl font-semibold text-lg"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Social proof */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`w-10 h-10 rounded-full border-2 border-card bg-gradient-to-br ${
                    i % 4 === 1 ? 'from-primary to-accent' :
                    i % 4 === 2 ? 'from-secondary to-accent' :
                    i % 4 === 3 ? 'from-accent to-primary' :
                    'from-success to-secondary'
                  }`}
                />
              ))}
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-foreground">2,847 educators</div>
              <div className="text-xs text-muted-foreground">joined this month</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
