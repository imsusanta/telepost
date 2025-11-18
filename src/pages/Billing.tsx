import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionService, SubscriptionPlan, UserSubscription } from "@/services/subscriptionService";
import { supabase } from "@/integrations/supabase/client";

export default function Billing() {
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [subscription, plans] = await Promise.all([
        SubscriptionService.getUserSubscription(user.id),
        SubscriptionService.getPlans(),
      ]);

      setCurrentSubscription(subscription);
      setAvailablePlans(plans);
    } catch (error: any) {
      console.error("Failed to load billing info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (currentSubscription) {
        await SubscriptionService.upgradeSubscription(user.id, planName);
        toast({
          title: "Plan Upgraded",
          description: `Successfully upgraded to ${planName}`,
        });
      } else {
        await SubscriptionService.createSubscription(user.id, planName);
        toast({
          title: "Subscription Created",
          description: `Successfully subscribed to ${planName}`,
        });
      }

      loadBillingInfo();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      features: [
        "1 Telegram Channel",
        "Upload PDFs (Up to 10GB)",
        "AI Quiz Generation",
        "50 Quizzes/month",
        "Basic Scheduling",
        "PDF Explanations",
        "Question Bank (10K questions)",
        "Email Support"
      ],
      current: false,
      gradient: "from-primary to-accent",
      description: "Perfect for small coaching classes"
    },
    {
      name: "Pro",
      price: "$99",
      period: "/month",
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
        "Leaderboards & Gamification",
        "Custom Branding on PDFs",
        "Multi-Language Support",
        "Priority Support"
      ],
      current: true,
      gradient: "from-accent to-secondary",
      popular: true,
      description: "Best for coaching institutes"
    },
    {
      name: "Agency",
      price: "$249",
      period: "/month",
      features: [
        "10 Telegram Channels",
        "Unlimited Everything",
        "White-Label Solution",
        "API Access",
        "Dedicated Account Manager",
        "Custom Quiz Templates",
        "Advanced Analytics & Reporting",
        "Multi-Admin Access",
        "24/7 Priority Support",
        "Custom Integrations"
      ],
      current: false,
      gradient: "from-secondary to-success",
      description: "For multi-branch institutes"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      features: [
        "Unlimited Channels",
        "Everything in Agency",
        "On-premise Deployment",
        "Custom Development",
        "SLA Guarantee",
        "Training & Onboarding",
        "Dedicated Infrastructure",
        "Advanced Security & Compliance"
      ],
      current: false,
      gradient: "from-success to-primary",
      description: "For large organizations"
    },
  ];

  // Match current plan with UI plans
  const currentPlanName = currentSubscription?.plan ? (currentSubscription.plan as any).name : null;
  const plansWithCurrentStatus = plans.map((plan) => ({
    ...plan,
    current: plan.name.toLowerCase() === currentPlanName?.toLowerCase(),
  }));

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
          {plansWithCurrentStatus.map((plan, idx) => (
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
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
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
                  disabled={plan.current || loading}
                  onClick={() => handleUpgrade(plan.name.toLowerCase())}
                >
                  {plan.current ? "Current Plan" : loading ? "Loading..." : "Upgrade Now"}
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
