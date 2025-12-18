import { Button } from "./ui/button";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";

interface CTAProps {
  onGetStarted: () => void;
}

export const CTA = ({ onGetStarted }: CTAProps) => {
  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" aria-labelledby="cta-heading">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-hero-glow opacity-50" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="glass-card p-12 md:p-16 text-center relative overflow-hidden">
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-2xl gradient-border opacity-50" />
          
          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Join 500+ institutes</span>
            </div>

            <h2 id="cta-heading" className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6">
              Ready to transform
              <span className="text-gradient-primary block">your teaching?</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of educators who are saving hours every week with AI-powered quiz generation and automated delivery.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="group h-14 px-8 text-lg font-semibold btn-primary-gradient rounded-full text-white shadow-glow-lg hover:shadow-glow-xl transition-all duration-500"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 text-lg font-medium rounded-full glass-button"
              >
                Book a Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-secondary" />
                <span>14-day free trial</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
