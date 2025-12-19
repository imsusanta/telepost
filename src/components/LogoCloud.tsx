import { useInView } from "@/hooks/useInView";

export const LogoCloud = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  
  const logosRow1 = [
    "Harvard", "Stanford", "MIT", "Oxford", "Cambridge", "Yale",
    "Princeton", "Berkeley", "Columbia", "Cornell", "Duke", "Northwestern"
  ];

  const logosRow2 = [
    "UCLA", "Chicago", "Penn", "Johns Hopkins", "NYU", "Brown",
    "Caltech", "Carnegie Mellon", "Georgia Tech", "Michigan", "USC", "Toronto"
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
          Trusted by educators at <span className="text-foreground font-semibold">500+ leading institutions</span>
        </p>
        
        {/* Row 1 - Scrolling left */}
        <div className="relative group mb-8">
          {/* Gradient masks for seamless fade */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          {/* Marquee container */}
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
              {/* First set */}
              {logosRow1.map((logo, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 mx-10 text-xl font-display font-semibold text-muted-foreground/30 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
                >
                  {logo}
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {logosRow1.map((logo, index) => (
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

        {/* Row 2 - Scrolling right (slower) */}
        <div className="relative group">
          {/* Gradient masks */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          {/* Marquee container - reverse direction */}
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-reverse group-hover:[animation-play-state:paused]">
              {/* First set */}
              {logosRow2.map((logo, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 mx-10 text-xl font-display font-semibold text-muted-foreground/30 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
                >
                  {logo}
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {logosRow2.map((logo, index) => (
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
