import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface CTAProps {
  onGetStarted: () => void;
}

export const CTA = ({ onGetStarted }: CTAProps) => {
  const { ref, isInView } = useInView({ threshold: 0.3 });

  return (
    <section 
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden" 
      aria-labelledby="cta-heading"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] transition-all duration-1000 ${
          isInView ? "opacity-100 scale-100" : "opacity-0 scale-50"
        }`} />
      </div>

      <div className={`max-w-2xl mx-auto text-center relative z-10 transition-all duration-700 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}>
        <h2 
          id="cta-heading" 
          className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4"
        >
          Ready to get started?
        </h2>
        
        <p className={`text-muted-foreground mb-10 transition-all duration-700 delay-100 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          Join thousands of educators saving hours every week.
        </p>

        <div className={`transition-all duration-700 delay-200 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="group h-14 px-10 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-glow animate-glow-pulse"
          >
            Start for free
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <p className={`text-xs text-muted-foreground mt-8 transition-all duration-700 delay-300 ${
          isInView ? "opacity-100" : "opacity-0"
        }`}>
          No credit card required
        </p>
      </div>
    </section>
  );
};
