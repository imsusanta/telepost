import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Check } from "lucide-react";

export default function Billing() {
  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      features: ["20 quizzes/month", "Basic AI generation", "1 connected bot", "Community support"],
      current: true,
      gradient: "from-muted to-secondary/30"
    },
    {
      name: "Basic",
      price: "₹499",
      period: "/month",
      features: ["Unlimited quizzes", "Advanced AI generation", "5 connected bots", "Priority support", "Custom branding"],
      current: false,
      gradient: "from-primary to-accent"
    },
    {
      name: "Pro",
      price: "₹999",
      period: "/month",
      features: ["Everything in Basic", "Scheduled daily quizzes", "Unlimited bots", "Analytics dashboard", "API access", "24/7 support"],
      current: false,
      gradient: "from-accent to-secondary",
      popular: true
    },
    {
      name: "Agency",
      price: "₹2,499",
      period: "/month",
      features: ["Everything in Pro", "Unlimited channels", "Team collaboration", "White-label solution", "Dedicated account manager", "Custom integrations"],
      current: false,
      gradient: "from-secondary to-success"
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold text-gradient bg-gradient-to-r from-primary via-accent to-secondary mb-2">
            Billing & Plans
          </h1>
          <p className="text-muted-foreground text-lg">Choose the perfect plan for your needs</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, idx) => (
            <Card
              key={plan.name}
              className={`clay-card-hover bg-card/50 backdrop-blur-sm border-border animate-scale-in relative ${
                plan.popular ? "ring-2 ring-primary shadow-clay-lg scale-105" : ""
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="clay-card bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-clay">
                    POPULAR
                  </span>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-foreground">
                  <span className="text-2xl font-bold">{plan.name}</span>
                  {plan.current && (
                    <span className="clay-card bg-success/20 text-success-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-baseline space-x-1 mt-2">
                    <span className={`text-4xl font-bold text-gradient bg-gradient-to-r ${plan.gradient}`}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start space-x-2.5 text-sm">
                      <div className="clay-card bg-success/20 p-1 rounded-full mt-0.5">
                        <Check className="w-3 h-3 text-success-foreground" />
                      </div>
                      <span className="text-foreground/90 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full clay-button rounded-2xl py-6 font-semibold ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground"
                      : ""
                  }`}
                  variant={plan.current ? "secondary" : "default"}
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : "Upgrade Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="clay-card bg-card/50 backdrop-blur-sm border-border animate-scale-in" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground text-2xl">
              <div className="clay-card bg-primary/20 p-2 rounded-xl">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <span>Payment Method</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">Manage your billing information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">No payment method added yet.</p>
            <Button variant="outline" className="clay-button rounded-2xl px-6 py-5">
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
