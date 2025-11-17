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
    },
    {
      name: "Basic",
      price: "₹499",
      period: "/month",
      features: ["Unlimited quizzes", "Advanced AI generation", "5 connected bots", "Priority support", "Custom branding"],
      current: false,
    },
    {
      name: "Pro",
      price: "₹999",
      period: "/month",
      features: ["Everything in Basic", "Scheduled daily quizzes", "Unlimited bots", "Analytics dashboard", "API access", "24/7 support"],
      current: false,
    },
    {
      name: "Agency",
      price: "₹2,499",
      period: "/month",
      features: ["Everything in Pro", "Unlimited channels", "Team collaboration", "White-label solution", "Dedicated account manager", "Custom integrations"],
      current: false,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Billing & Plans</h1>
          <p className="text-gray-400">Choose the perfect plan for your needs</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`bg-slate-900/50 border-white/10 ${
                plan.current ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  {plan.current && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">{plan.period}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start space-x-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.current ? "secondary" : "default"}
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Payment Method</span>
            </CardTitle>
            <CardDescription>Manage your billing information</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">No payment method added yet.</p>
            <Button variant="outline">Add Payment Method</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
