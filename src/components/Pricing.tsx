import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingProps {
  onGetStarted: () => void;
}

export const Pricing = ({ onGetStarted }: PricingProps) => {
  const plans = [
    {
      name: "Basic",
      price: "$29",
      period: "/month",
      description: "Perfect for small coaching classes",
      features: [
        "1 Telegram Channel",
        "Upload PDFs (Up to 10GB)",
        "AI Quiz Generation",
        "50 Quizzes/month",
        "Basic Scheduling",
        "PDF Explanations",
        "Question Bank (10K questions)"
      ],
      gradient: "from-primary to-accent",
      popular: false,
    },
    {
      name: "Pro",
      price: "$99",
      period: "/month",
      description: "Best for coaching institutes",
      features: [
        "3 Telegram Channels",
        "Unlimited PDF Uploads (50GB)",
        "Advanced AI from Documents",
        "Unlimited Quizzes",
        "Auto-Post Scheduling (Set & Forget)",
        "Auto PDF Explanations",
        "Batch Generate 30 Quizzes at Once",
        "Question Bank (50K+ questions)",
        "Engagement Analytics Dashboard",
        "Custom Branding on PDFs",
        "Multi-Language Support"
      ],
      gradient: "from-accent to-secondary",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large organizations",
      features: [
        "Unlimited Channels",
        "Everything in Pro",
        "On-premise Deployment",
        "Custom Development",
        "SLA Guarantee",
        "Training & Onboarding",
        "Dedicated Infrastructure",
        "Advanced Security & Compliance"
      ],
      gradient: "from-success to-primary",
      popular: false,
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background via-accent/5 to-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-bold text-gradient bg-gradient-to-r from-primary via-accent to-secondary mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <Card
              key={plan.name}
              className={`clay-card-hover bg-card/50 backdrop-blur-sm border-border animate-scale-in relative ${
                plan.popular ? "ring-2 ring-primary shadow-clay-lg scale-105 md:scale-110" : ""
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="clay-card bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-bold px-6 py-2 rounded-full shadow-clay flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    MOST POPULAR
                  </span>
                </div>
              )}

              <CardHeader className="pb-4 pt-6">
                <CardTitle className="flex items-center justify-between text-foreground">
                  <span className="text-2xl font-bold">{plan.name}</span>
                </CardTitle>
                <CardDescription>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline space-x-1">
                    <span className={`text-5xl font-bold text-gradient bg-gradient-to-r ${plan.gradient}`}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start space-x-3 text-sm">
                      <div className="clay-card bg-success/20 p-1 rounded-full mt-0.5 flex-shrink-0">
                        <Check className="w-3 h-3 text-success-foreground" />
                      </div>
                      <span className="text-foreground/90 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full clay-button rounded-2xl py-6 font-semibold transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-clay-lg"
                      : "hover:scale-105"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={onGetStarted}
                >
                  {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <p className="text-muted-foreground">
            All plans include 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
};
