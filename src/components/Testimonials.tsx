import { MessageSquare } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export const Testimonials = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section
      id="testimonials"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-t border-border/50"
    >
      <div className="max-w-3xl mx-auto relative text-center">
        <div className={`transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm text-sm text-muted-foreground mb-6">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span>Early access</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-6">
            We collect reviews from
            <span className="text-gradient-primary"> real coaches</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            TelePost is invitation-only while we work with exam educators on Telegram.
            Public ratings will appear here once customers publish them on G2, Capterra, or Product Hunt.
            If you already use TelePost and want to share results, email{" "}
            <a href="mailto:support@telepost.tech" className="text-primary hover:underline">
              support@telepost.tech
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
};
