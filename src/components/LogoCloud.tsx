import { useInView } from "@/hooks/useInView";

export const LogoCloud = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const examsRow1 = [
    "UPSC", "SSC", "NEET", "JEE", "Banking", "Railway",
    "State PSC", "Defence", "Teaching", "Police",
  ];

  const examsRow2 = [
    "Current Affairs", "Quant", "Reasoning", "English", "GS",
    "Hindi", "Bengali", "Prelims", "Mains", "Daily Quiz",
  ];

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <p className={`text-center text-base sm:text-lg text-muted-foreground mb-12 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          Built for educators running{" "}
          <span className="text-foreground font-semibold">Indian competitive-exam channels</span>
        </p>

        <div className="relative group mb-8">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
              {examsRow1.map((logo, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 mx-10 text-xl font-display font-semibold text-muted-foreground/30 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
                >
                  {logo}
                </div>
              ))}
              {examsRow1.map((logo, index) => (
                <div
                  key={`second-${index}`}
                  className="flex-shrink-0 mx-10 text-xl font-display font-semibold text-muted-foreground/30 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-reverse group-hover:[animation-play-state:paused]">
              {examsRow2.map((logo, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 mx-10 text-xl font-display font-semibold text-muted-foreground/30 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
                >
                  {logo}
                </div>
              ))}
              {examsRow2.map((logo, index) => (
                <div
                  key={`second-${index}`}
                  className="flex-shrink-0 mx-10 text-xl font-display font-semibold text-muted-foreground/30 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
