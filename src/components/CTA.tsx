import { Button } from "./ui/button";
import { ArrowRight, Shield, Check, Star, Send } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface CTAProps {
  onGetStarted: () => void;
}

export const CTA = ({ onGetStarted }: CTAProps) => {
  const { ref, isInView } = useInView({ threshold: 0.3 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-40 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="cta-heading"
    >
      {/* Animated background gradient - Telegram themed */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#0088cc]/5 rounded-full blur-[120px] transition-all duration-1000 ${isInView ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`} />
        <div className={`absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] transition-all duration-1000 delay-200 ${isInView ? "opacity-100" : "opacity-0"
          }`} />
        <div className={`absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] transition-all duration-1000 delay-300 ${isInView ? "opacity-100" : "opacity-0"
          }`} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Testimonial quote */}
        <div className={`text-center mb-12 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
          <div className="inline-flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            ))}
          </div>
          <blockquote className="text-xl sm:text-2xl text-foreground/80 italic mb-4">
            "TelePost tripled our quiz engagement overnight. We save 20+ minutes daily on quiz creation and delivery."
          </blockquote>
          <cite className="text-muted-foreground not-italic flex flex-col items-center gap-1">
            <span>— Priyanshu Das, Director</span>
            <span className="text-sm">Udaan Coaching Institute</span>
          </cite>
        </div>

        {/* Main CTA */}
        <div className={`text-center transition-all duration-700 delay-100 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
          <h2
            id="cta-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6"
          >
            Start Today,
            <span className="text-gradient-primary"> Completely Free</span>
          </h2>

          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of educators who save hours every week and engage millions of students
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="group h-16 px-12 text-lg font-medium bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white hover:from-[#0077b5] hover:to-[#006699] rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(0,136,204,0.4)]"
            >
              <Send className="w-5 h-5 mr-2" />
              Start Free Today
              <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <button
              className="text-base text-muted-foreground hover:text-foreground transition-colors relative group"
            >
              Schedule a Demo
              <span className="inline-block ml-1 transition-transform group-hover:translate-x-0.5">→</span>
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground transition-all group-hover:w-full" />
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span>100% Secure</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
