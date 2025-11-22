const steps = [
  {
    number: "1",
    title: "Upload content",
    description: "Drop your PDFs, notes, or textbooks. AI analyzes instantly.",
  },
  {
    number: "2",
    title: "Generate quizzes",
    description: "AI creates engaging questions aligned with your curriculum.",
  },
  {
    number: "3",
    title: "Auto-post",
    description: "Schedule and publish to Telegram automatically.",
  },
  {
    number: "4",
    title: "Track results",
    description: "Monitor engagement and deliver instant explanations.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30" aria-labelledby="how-it-works-heading">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground">
            Four simple steps to automate your quiz workflow.
          </p>
        </div>

        {/* Steps */}
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 list-none">
          {steps.map((step, idx) => (
            <li key={idx} className="text-center">
              <div
                className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-semibold"
                aria-label={`Step ${step.number}`}
              >
                {step.number}
              </div>
              <h3 className="text-base font-semibold mb-2 text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
