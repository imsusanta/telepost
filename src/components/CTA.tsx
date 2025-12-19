import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

interface CTAProps {
  onGetStarted: () => void;
}

export const CTA = ({ onGetStarted }: CTAProps) => {
  return (
    <section 
      className="py-24 px-4 sm:px-6 lg:px-8" 
      aria-labelledby="cta-heading"
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2 
          id="cta-heading" 
          className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4"
        >
          Ready to get started?
        </h2>
        
        <p className="text-muted-foreground mb-8">
          Join thousands of educators saving hours every week.
        </p>

        <Button
          onClick={onGetStarted}
          size="lg"
          className="h-12 px-8 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full transition-all duration-300"
        >
          Start for free
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <p className="text-xs text-muted-foreground mt-6">
          No credit card required
        </p>
      </div>
    </section>
  );
};
