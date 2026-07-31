import { Button } from "./ui/button";
import { ArrowRight, Send, Calendar, Check, Gift, ShieldCheck } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface CTAProps {
  onGetStarted: () => void;
}

export const CTA = ({ onGetStarted }: CTAProps) => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="cta-heading"
    >
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Main CTA Glass Card */}
        <div className={`p-8 sm:p-12 md:p-16 rounded-3xl bg-gradient-to-br from-sky-50/80 via-card to-purple-50/60 dark:from-sky-950/30 dark:via-card dark:to-purple-950/30 border border-sky-100 dark:border-sky-900/40 shadow-xl relative overflow-hidden transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}>
          {/* Top-Right Dotted Grid Pattern from Screenshot */}
          <div className="hidden lg:block absolute right-[3%] top-[8%] w-56 h-56 opacity-20 pointer-events-none bg-[radial-gradient(#0088cc_1.5px,transparent_1.5px)] [background-size:16px_16px]" />

          {/* Left Side: Large 3D Blue Paperplane + Dashed Trail */}
          <div className="hidden lg:block absolute left-[4%] top-[18%] text-[#0088cc] pointer-events-none z-0">
            <svg className="w-56 h-56" viewBox="0 0 240 240" fill="none">
              <path d="M 20 180 C 10 90, 90 40, 110 100 C 130 160, 50 160, 60 110 C 70 60, 140 30, 200 45" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.3" fill="none" />
              <g transform="translate(190, 20) rotate(-15) scale(1.5)">
                <path d="M 2.01 21 L 23 12 L 2.01 3 L 2 10 L 17 12 L 2 14 Z" fill="url(#cta-plane-grad)" />
                <defs>
                  <linearGradient id="cta-plane-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="1" stopColor="#0088cc" />
                  </linearGradient>
                </defs>
              </g>
            </svg>
          </div>

          <div className="max-w-2xl mx-auto text-center relative z-10">
            {/* Headline */}
            <h2
              id="cta-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4"
            >
              Ready to save hours every week?
            </h2>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-muted-foreground mb-9 leading-relaxed">
              Join thousands of educators who automate quizzes and engage students
              <br className="hidden sm:block" />
              on Telegram — in just a few clicks.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Button
                onClick={onGetStarted}
                size="lg"
                className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-[#0088cc] to-[#0077b5] hover:from-[#0077b5] hover:to-[#006699] text-white rounded-full transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-[#0088cc]/25 flex items-center gap-2"
              >
                <Send className="w-4 h-4 fill-white" />
                Start Free Today
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const message = encodeURIComponent("Hi TelePost Team, I would like to schedule a demo for Telegram quiz automation.");
                  window.open(`https://wa.me/918927093059?text=${message}`, "_blank");
                }}
                className="h-14 px-8 text-base font-semibold bg-card hover:bg-muted/50 border border-border/80 text-foreground rounded-full transition-all duration-300 hover:scale-[1.02] shadow-sm flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Schedule a Demo
                <ArrowRight className="w-4 h-4 ml-1 text-muted-foreground" />
              </Button>
            </div>

            {/* Bottom 3 Trust Badges from Screenshot */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-muted-foreground pt-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>No credit card required</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Gift className="w-3 h-3" />
                </div>
                <span>14-day free trial</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-[#0088cc] flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>100% Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
