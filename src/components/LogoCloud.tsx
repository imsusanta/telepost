import { useInView } from "@/hooks/useInView";

export const LogoCloud = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  
  const logos = [
    "Harvard", "Stanford", "MIT", "Oxford", "Cambridge", "Yale",
    "Princeton", "Berkeley", "Columbia", "Cornell", "Duke", "Northwestern"
  ];

  return (
    <section 
      ref={ref as React.RefObject<HTMLElement>}
      className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto">
        <p className={`text-center text-sm text-muted-foreground mb-8 transition-all duration-700 ${
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          Trusted by educators at leading institutions
        </p>
        
        {/* Infinite scroll container */}
        <div className="relative group">
          {/* Gradient masks for seamless fade */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          
          {/* Marquee container */}
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
              {/* First set */}
              {logos.map((logo, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 mx-8 text-lg font-display font-semibold text-muted-foreground/40 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
                >
                  {logo}
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {logos.map((logo, index) => (
                <div
                  key={`second-${index}`}
                  className="flex-shrink-0 mx-8 text-lg font-display font-semibold text-muted-foreground/40 hover:text-foreground transition-all duration-300 cursor-default hover:scale-110"
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
