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
      className="py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
      aria-labelledby="how-it-works-heading"
    >
      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes count-up {
          0% { transform: translateY(20px); opacity: 0; }
          60% { transform: translateY(-3px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-up-fade {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 136, 204, 0.3); }
          50% { box-shadow: 0 0 20px 4px rgba(0, 136, 204, 0.15); }
        }
        .step-card {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .step-card:hover {
          transform: translateY(-8px) scale(1.02);
        }
        .step-card:hover .icon-circle {
          border-color: #0088cc;
          box-shadow: 0 0 30px rgba(0, 136, 204, 0.25);
        }
        .step-card:hover .step-icon {
          color: #0088cc;
          animation: float 2s ease-in-out infinite;
        }
        .step-card:hover .step-badge {
          animation: glow-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

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
          {/* Animated connection line with shimmer */}
          <div className="hidden lg:block absolute top-20 left-[16.67%] right-[16.67%] h-1 overflow-hidden rounded-full bg-muted/30">
            <div
              className={`h-full transition-all duration-1500 ease-out ${isInView ? "w-full" : "w-0"}`}
              style={{
                transitionDelay: "400ms",
                background: "linear-gradient(90deg, #0088cc, #00b4d8, #0088cc)",
                backgroundSize: "200% 100%",
                animation: isInView ? "shimmer 3s ease-in-out infinite" : "none",
              }}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="step-card relative text-center"
                style={{
                  animation: isInView
                    ? `slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 200 + 200}ms both`
                    : "none",
                  opacity: isInView ? undefined : 0,
                }}
              >
                {/* Time badge */}
                <div
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#0088cc]/10 text-[#0088cc] text-sm font-medium mb-4"
                  style={{
                    animation: isInView
                      ? `count-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 200 + 600}ms both`
                      : "none",
                    opacity: isInView ? undefined : 0,
                  }}
                >
                  <Zap className="w-3 h-3" />
                  {step.time}
                </div>

                {/* Icon circle */}
                <div className="icon-circle group relative inline-flex items-center justify-center w-28 h-28 rounded-full border-2 border-border bg-background mb-8 z-10 transition-all duration-400 cursor-default mx-auto">
                  <step.icon className="step-icon w-12 h-12 text-muted-foreground transition-all duration-300" />

                  {/* Pulse rings on hover */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#0088cc]/40 opacity-0 group-hover:opacity-100" style={{ animation: 'pulse-ring 1.5s ease-out infinite' }} />
                  <div className="absolute inset-0 rounded-full border-2 border-[#0088cc]/30 opacity-0 group-hover:opacity-100" style={{ animation: 'pulse-ring 1.5s ease-out 0.5s infinite' }} />

                  {/* Step number badge with bounce-in */}
                  <div
                    className="step-badge absolute -top-2 -left-2 w-10 h-10 rounded-full bg-[#0088cc] text-white text-lg font-bold flex items-center justify-center shadow-lg shadow-[#0088cc]/40 ring-4 ring-background"
                    style={{
                      animation: isInView
                        ? `bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 200 + 400}ms both`
                        : "none",
                      opacity: isInView ? undefined : 0,
                    }}
                  >
                    {idx + 1}
                  </div>
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
          <div
            className="mt-16 text-center"
            style={{
              animation: isInView
                ? "slide-up-fade 0.7s cubic-bezier(0.16, 1, 0.3, 1) 1000ms both"
                : "none",
              opacity: isInView ? undefined : 0,
            }}
          >
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0088cc]/10 via-primary/5 to-[#0088cc]/10 border border-[#0088cc]/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#0088cc]/10 cursor-default">
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
