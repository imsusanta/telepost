import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Check, Tag, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionService, SubscriptionPlan, UserSubscription } from "@/services/subscriptionService";
import { validateCoupon } from "@/services/couponService";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function Billing() {
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [_availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [canPurchase, setCanPurchase] = useState(true);
  const [purchaseRestrictionMessage, setPurchaseRestrictionMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
    final_amount: number;
    plan_name: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [subscription, plans, purchasePermission] = await Promise.all([
        SubscriptionService.getUserSubscription(user.id),
        SubscriptionService.getPlans(),
        SubscriptionService.canPurchasePlans(user.id),
      ]);

      setCurrentSubscription(subscription);
      setAvailablePlans(plans);
      setCanPurchase(purchasePermission.allowed);
      if (!purchasePermission.allowed) {
        setPurchaseRestrictionMessage(purchasePermission.reason || "Purchase restricted");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load billing information: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async (planName: string, planPrice: number) => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    try {
      setValidatingCoupon(true);
      const result = await validateCoupon(couponCode.toUpperCase(), planName.toLowerCase(), planPrice);

      if (result.is_valid) {
        setAppliedCoupon({
          code: couponCode.toUpperCase(),
          discount_type: result.discount_type!,
          discount_value: result.discount_value!,
          discount_amount: result.discount_amount!,
          final_amount: result.final_amount!,
          plan_name: planName.toLowerCase(),
        });
        toast({
          title: "Coupon Applied",
          description: `You saved $${result.discount_amount?.toFixed(2)}!`,
        });
      } else {
        toast({
          title: "Invalid Coupon",
          description: result.error_message || "This coupon is not valid",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to validate coupon",
        variant: "destructive",
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handleUpgrade = async (planName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const couponToApply = appliedCoupon && appliedCoupon.plan_name === planName.toLowerCase()
        ? appliedCoupon.code
        : undefined;

      if (currentSubscription) {
        await SubscriptionService.upgradeSubscription(user.id, planName);
        toast({
          title: "Plan Upgraded",
          description: `Successfully upgraded to ${planName}`,
        });
      } else {
        await SubscriptionService.createSubscription(user.id, planName, couponToApply);
        toast({
          title: "Subscription Created",
          description: couponToApply
            ? `Successfully subscribed to ${planName} with coupon ${couponToApply}`
            : `Successfully subscribed to ${planName}`,
        });
      }

      // Clear coupon after successful purchase
      setAppliedCoupon(null);
      setCouponCode("");
      loadBillingInfo();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddPaymentMethod = () => {
    toast({
      title: "Coming Soon",
      description: "Payment method integration is being set up. Contact support for manual payment options.",
      variant: "default",
    });
  };

  const plans = [
    {
      name: "Starter",
      price: "$29",
      numericPrice: 29,
      period: "/month",
      features: [
        "1 Telegram Channel",
        "Upload PDFs (Up to 10GB)",
        "AI Quiz Generation",
        "50 Quizzes/month",
        "Basic Scheduling",
        "PDF Explanations",
        "Question Bank (10K questions)"
      ],
      current: false,
      gradient: "from-primary to-accent",
      description: "Perfect for small coaching classes"
    },
    {
      name: "Pro",
      price: "$99",
      numericPrice: 99,
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
        "Custom Branding on PDFs",
        "Multi-Language Support"
      ],
      current: true,
      gradient: "from-accent to-secondary",
      popular: true,
      description: "Best for coaching institutes"
    },
    {
      name: "Agency",
      price: "$249",
      numericPrice: 249,
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
        "Custom Integrations"
      ],
      current: false,
      gradient: "from-secondary to-success",
      description: "For multi-branch institutes"
    },
    {
      name: "Enterprise",
      price: "Custom",
      numericPrice: 999,
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

        {!canPurchase && (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">{purchaseRestrictionMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Coupon Code Section */}
        <Card className="clay-card bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <div className="clay-card bg-primary/20 p-2 rounded-xl">
                <Tag className="w-5 h-5 text-primary" />
              </div>
              <span>Have a Coupon Code?</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your coupon code to get a discount on your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="font-mono">
                      {appliedCoupon.code}
                    </Badge>
                    <span className="text-sm text-success-foreground font-medium">
                      {appliedCoupon.discount_type === 'percentage'
                        ? `${appliedCoupon.discount_value}% OFF`
                        : `$${appliedCoupon.discount_value} OFF`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Applied to {appliedCoupon.plan_name} plan - You save ${appliedCoupon.discount_amount.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCoupon}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  disabled={validatingCoupon || !couponCode.trim()}
                  onClick={() => {
                    // For now, just validate without applying to a specific plan
                    // The coupon will be validated again when user selects a plan
                    toast({
                      title: "Info",
                      description: "Select a plan below to apply your coupon",
                    });
                  }}
                >
                  {validatingCoupon ? "Validating..." : "Ready"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                  <div className="space-y-2">
                    <div className="flex items-baseline space-x-1">
                      <span className={`text-4xl font-bold text-gradient bg-gradient-to-r ${plan.gradient}`}>
                        {appliedCoupon && appliedCoupon.plan_name === plan.name.toLowerCase() && plan.price !== "Custom"
                          ? `$${appliedCoupon.final_amount.toFixed(0)}`
                          : plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {appliedCoupon && appliedCoupon.plan_name === plan.name.toLowerCase() && plan.price !== "Custom" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground line-through">{plan.price}</span>
                        <Badge variant="default" className="text-xs">
                          Save ${appliedCoupon.discount_amount.toFixed(2)}
                        </Badge>
                      </div>
                    )}
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
                {couponCode && !appliedCoupon && plan.price !== "Custom" && (
                  <Button
                    variant="outline"
                    className="w-full mb-2"
                    disabled={validatingCoupon}
                    onClick={() => handleApplyCoupon(plan.name, plan.numericPrice)}
                  >
                    {validatingCoupon ? "Validating..." : "Apply Coupon"}
                  </Button>
                )}
                <Button
                  className={`w-full clay-button rounded-2xl py-6 font-semibold ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground"
                      : ""
                  }`}
                  variant={plan.current ? "secondary" : "default"}
                  disabled={plan.current || loading || !canPurchase}
                  onClick={() => handleUpgrade(plan.name.toLowerCase())}
                >
                  {plan.current ? "Current Plan" : loading ? "Loading..." : !canPurchase ? "Purchase Restricted" : "Upgrade Now"}
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
            <Button
              variant="outline"
              className="clay-button rounded-2xl px-6 py-5"
              onClick={handleAddPaymentMethod}
            >
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
