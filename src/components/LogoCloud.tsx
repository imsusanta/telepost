export const LogoCloud = () => {
  const logos = [
    "Harvard", "Stanford", "MIT", "Oxford", "Cambridge", "Yale"
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/50">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Trusted by educators at leading institutions
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((logo) => (
            <div
              key={logo}
              className="text-lg font-display font-semibold text-muted-foreground/40 hover:text-muted-foreground transition-colors duration-300"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
