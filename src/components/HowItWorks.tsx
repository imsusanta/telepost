import { FileText, Zap, Send } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
  {
    icon: FileText,
    time: "10 sec",
    title: "Create Questions",
    description: "Type manually or let AI generate from your PDF.",
  },
  {
    icon: Zap,
    time: "5 sec",
    title: "Select Channel",
    description: "Choose your Telegram channel from the list.",
  },
  {
    icon: Send,
    time: "15 sec",
    title: "Post to Telegram",
    description: "Hit send now or schedule for later.",
  },
];

export const HowItWorks = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section
      id="how-it-works"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8"
      aria-labelledby="how-it-works-heading"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className={`text-center mb-20 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}>
          {/* Animated timer badge */}
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[#0088cc]/30 bg-[#0088cc]/5 text-[#0088cc] mb-8">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-[#0088cc]/30 flex items-center justify-center">
                <span className="text-lg font-bold">30</span>
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-[#0088cc] border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <span className="font-medium">Seconds to Complete</span>
          </div>

          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6"
          >
            Just <span className="text-gradient-primary">3 Simple Steps</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            From creating questions to posting on Telegram—done in 30 seconds flat
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Animated connection line */}
          <div className="hidden lg:block absolute top-20 left-[16.67%] right-[16.67%] h-1 overflow-hidden rounded-full bg-muted/30">
            <div
              className={`h-full bg-gradient-to-r from-[#0088cc] via-primary to-[#0088cc] transition-all duration-1500 ease-out ${isInView ? "w-full" : "w-0"
                }`}
              style={{ transitionDelay: "400ms" }}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`relative text-center transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                style={{ transitionDelay: `${idx * 200 + 200}ms` }}
              >
                {/* Time badge */}
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0088cc]/10 text-[#0088cc] text-sm font-medium mb-4 transition-all duration-500 ${isInView ? "opacity-100 scale-100" : "opacity-0 scale-0"
                  }`}
                  style={{ transitionDelay: `${idx * 200 + 600}ms` }}
                >
                  <Zap className="w-3 h-3" />
                  {step.time}
                </div>

                {/* Icon circle */}
                <div className="group relative inline-flex items-center justify-center w-28 h-28 rounded-full border-2 border-border bg-background mb-8 z-10 transition-all duration-300 hover:border-[#0088cc] hover:shadow-[0_0_30px_rgba(0,136,204,0.3)] cursor-default mx-auto">
                  <step.icon className="w-12 h-12 text-muted-foreground group-hover:text-[#0088cc] transition-colors duration-300" />

                  {/* Pulse ring on hover */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#0088cc]/50 opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
                </div>

                {/* Step number badge */}
                <div className={`absolute top-8 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#0088cc] text-white text-lg font-bold flex items-center justify-center transition-all duration-500 shadow-[0_0_20px_rgba(0,136,204,0.4)] ${isInView ? "opacity-100 scale-100" : "opacity-0 scale-0"
                  }`}
                  style={{ transitionDelay: `${idx * 200 + 400}ms` }}
                >
                  {idx + 1}
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* Total time summary */}
          <div className={`mt-16 text-center transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "1000ms" }}
          >
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0088cc]/10 via-primary/5 to-[#0088cc]/10 border border-[#0088cc]/20">
              <div className="text-4xl font-display font-bold text-[#0088cc]">= 30 seconds</div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">Total Time</p>
                <p className="text-xs text-muted-foreground">Industry Fastest</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
