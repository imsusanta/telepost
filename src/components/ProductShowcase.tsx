import { useInView } from "@/hooks/useInView";
import { Check, Sparkles, Send, BarChart3 } from "lucide-react";

const features = [
  { icon: Sparkles, text: "AI-Powered Generation" },
  { icon: Send, text: "Auto Telegram Delivery" },
  { icon: BarChart3, text: "Real-time Analytics" },
  { icon: Check, text: "Question Bank" },
];

export const ProductShowcase = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-background/50 backdrop-blur-sm text-sm text-muted-foreground mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>See it in action</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-4">
            Powerful dashboard
            <span className="text-gradient-primary"> at your fingertips</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create, schedule, and analyze quizzes with our intuitive interface
          </p>
        </div>

        {/* Browser mockup */}
        <div
          className={`relative transition-all duration-1000 ${
            isInView
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-12 scale-95"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          {/* Glow effect behind */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-secondary/10 to-transparent blur-3xl -z-10 scale-110" />

          {/* Browser frame */}
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Browser header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1.5 rounded-lg bg-background/50 text-xs text-muted-foreground">
                  app.telepost.io/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-8 min-h-[400px] bg-gradient-to-br from-background via-background to-muted/20">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="h-10 rounded-lg bg-muted/50 animate-pulse" />
                  <div className="h-8 rounded-lg bg-muted/30" />
                  <div className="h-8 rounded-lg bg-primary/20" />
                  <div className="h-8 rounded-lg bg-muted/30" />
                  <div className="h-8 rounded-lg bg-muted/30" />
                </div>

                {/* Main content */}
                <div className="md:col-span-2 space-y-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-card/50 border border-border/30"
                      >
                        <div className="h-4 w-16 rounded bg-muted/50 mb-2" />
                        <div className="h-8 w-24 rounded bg-primary/20" />
                      </div>
                    ))}
                  </div>

                  {/* Chart placeholder */}
                  <div className="p-6 rounded-xl bg-card/50 border border-border/30">
                    <div className="h-4 w-32 rounded bg-muted/50 mb-4" />
                    <div className="h-48 rounded-lg bg-gradient-to-t from-primary/10 to-transparent flex items-end justify-around px-4 pb-4">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className="w-8 rounded-t bg-primary/40"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating feature cards */}
          <div className="absolute -left-4 top-1/4 hidden lg:block">
            <div
              className={`p-4 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-700 ${
                isInView
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
              }`}
              style={{ transitionDelay: "600ms" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    AI Generation
                  </div>
                  <div className="text-xs text-muted-foreground">
                    10 questions in 5s
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -right-4 top-1/3 hidden lg:block">
            <div
              className={`p-4 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 shadow-lg transition-all duration-700 ${
                isInView
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-8"
              }`}
              style={{ transitionDelay: "800ms" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Sent Successfully
                  </div>
                  <div className="text-xs text-muted-foreground">
                    5,234 students reached
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div
          className={`flex flex-wrap justify-center gap-4 mt-12 transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border/50 text-sm text-foreground"
            >
              <feature.icon className="w-4 h-4 text-primary" />
              {feature.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
