import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";

interface CTAProps {
  onGetStarted: () => void;
}

export const CTA = ({ onGetStarted }: CTAProps) => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8" aria-labelledby="cta-heading">
      <div className="max-w-3xl mx-auto text-center">
        <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          Ready to get started?
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Join 500+ institutes already automating their quiz workflow.
        </p>
        <Button
          onClick={onGetStarted}
          size="lg"
          className="group px-8 py-6 bg-foreground hover:bg-foreground/90 text-background rounded-full font-medium text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
          aria-label="Start your free trial with TelePost"
        >
          Start free trial
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          No credit card required
        </p>
      </div>
    </section>
  );
};
