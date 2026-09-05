import { useState, useEffect } from "react";
import { Check, Loader2, Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "./ui/button";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionService, type SubscriptionPlan } from "@/services/subscriptionService";
import { getRazorpay } from "@/lib/razorpay";

export const Pricing = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [fetching, setFetching] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await SubscriptionService.getPlans();
        setPlans(data);
      } catch (error) {
        console.error("Error loading plans:", error);
      } finally {
        setFetching(false);
      }
    };
    loadPlans();
  }, []);

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name === "pro" || name === "premium") return "💎";
    if (name === "basic" || name === "standard" || name === "starter") return "🚀";
    return "⚡";
  };

  const isPopularPlan = (plan: SubscriptionPlan) => {
    return (plan as any).is_popular === true || plan.name.toLowerCase() === "pro" || plan.name.toLowerCase() === "premium";
  };
 
  const getPlanFeatures = (plan: SubscriptionPlan) => {
    const checklist: { label: string; enabled: boolean }[] = [];
    const f = plan.features;

    // Limits (always enabled - they define what the plan offers)
    const chCount = plan.max_telegram_channels;
    checklist.push({ label: `${chCount} ${chCount === 1 ? 'Telegram Channel' : 'Channels Access'}`, enabled: true });

    const storageGb = plan.max_pdf_storage_gb;
    checklist.push({ label: storageGb > 0 ? `${storageGb}GB Storage` : 'No Storage', enabled: true });

    const quizLimit = plan.max_quizzes_per_month;
    checklist.push({ label: quizLimit === null || quizLimit >= 1000000 ? 'Unlimited Quizzes' : `${quizLimit >= 1000 ? `${(quizLimit / 1000).toFixed(0)}k` : quizLimit} Quizzes`, enabled: true });

    const qbSize = plan.max_question_bank_size;
    checklist.push({ label: qbSize >= 1000000 ? 'Unlimited Questions Capacity' : `${qbSize >= 1000 ? `${(qbSize / 1000).toFixed(0)}k` : qbSize} Questions Capacity`, enabled: true });

    // Feature toggles — show all, with enabled/disabled state
    const hasCreateQuiz = !!(f?.create_quiz?.ai_generated || f?.create_quiz?.manual_input || f?.create_quiz?.documents || f?.create_quiz?.question_bank);
    checklist.push({ label: 'Create Quiz', enabled: hasCreateQuiz });
    
    checklist.push({ label: 'Create Post', enabled: !!f?.create_post?.enabled });
    
    if (f?.create_post?.enabled && f?.create_post?.write_with_ai) {
      checklist.push({ label: 'AI Writing Assistant', enabled: true });
    }
    
    const hasQuestionBank = !!(f?.question_bank?.my_questions || f?.question_bank?.ai_generate || f?.question_bank?.pdf_generate);
    checklist.push({ label: 'Question Bank', enabled: hasQuestionBank });
    checklist.push({ label: 'Telegram Stories', enabled: !!f?.stories });
    checklist.push({ label: 'Knowledge Base', enabled: !!f?.knowledge_base });
    checklist.push({ label: 'Auto Scheduling', enabled: !!f?.scheduler });
    
    return checklist;
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    try {
      setLoading(plan.id);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Login Required",
          description: "Please login to subscribe to a plan.",
        });
        onGetStarted();
        return;
      }

      const user = session.user;

      if (plan.price === 0 || plan.billing_period === 'trial') {
        await SubscriptionService.createSubscription(user.id, plan.name);
        toast({
          title: "Plan Activated",
          description: `You are now on the ${plan.display_name} plan!`,
        });
        return;
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount: Math.round(plan.price * 100),
          planId: plan.name
        },
      });

      if (orderError || !orderData) throw new Error(orderError?.message || "Failed to create payment order");

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TelePost SaaS",
        description: `Subscribe to ${plan.display_name} Plan`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            setLoading(plan.id);
            toast({
              title: "Payment Successful",
              description: "Verifying your payment, please wait...",
            });

            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error(verifyError?.message || "Payment verification failed");
            }

            toast({
              title: "Subscription Activated",
              description: `Welcome to the ${plan.display_name} group!`,
            });
          } catch (err: any) {
            toast({
              title: "Verification Error",
              description: err.message || "Failed to verify payment",
              variant: "destructive",
            });
          } finally {
            setLoading(null);
          }
        },
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          ondismiss: () => setLoading(null)
        }
      };

      const Razorpay = await getRazorpay();
      const rzp = new Razorpay(options);
      rzp.open();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  if (fetching) {
    return (
      <section id="pricing" className="py-24 bg-background flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading plans...</p>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-24 relative overflow-hidden bg-background transition-colors duration-300">
      <div className="container px-4 mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Simple Pricing</span>
          </motion.div>
          
          <motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-foreground">
            Pricing
          </motion.h2>
          
          <motion.p variants={itemVariants} className="text-base text-muted-foreground font-medium leading-relaxed mb-8">
            Scale your Telegram community with powerful automation tools. Choose the plan that fits your institute's needs.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border shadow-sm">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                billingPeriod === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                billingPeriod === 'yearly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                billingPeriod === 'yearly'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>Save 20%</span>
            </button>
          </motion.div>
        </motion.div>

        {/* Plans Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch"
        >
          <AnimatePresence>
            {plans.map((plan: SubscriptionPlan) => {
              const popular = isPopularPlan(plan);
              const features = getPlanFeatures(plan);
              const icon = getPlanIcon(plan.name);
              
              return (
                <motion.div
                  key={plan.id}
                  variants={itemVariants}
                  className={`relative flex ${popular ? 'z-10 lg:-mx-2' : 'z-0'}`}
                >
                  <div
                    className={`flex flex-col w-full rounded-3xl transition-all duration-300 ${
                      popular
                        ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-[1.03] lg:scale-[1.05]'
                        : 'bg-card border border-border/80 text-card-foreground shadow-sm hover:shadow-lg dark:hover:border-primary/40'
                    }`}
                    style={popular ? {} : {}}
                  >
                    {/* Card Header */}
                    <div className="p-8 pb-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${
                          popular ? 'bg-white/20' : 'bg-primary/10'
                        }`}>
                          {icon}
                        </div>
                        <h3 className={`text-xl font-bold ${popular ? 'text-white' : 'text-foreground'}`}>
                          {plan.display_name}
                        </h3>
                      </div>

                      {/* Price */}
                      <div className="mb-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-4xl font-black tracking-tight ${popular ? 'text-white' : 'text-foreground'}`}>
                            ₹{billingPeriod === 'yearly' ? (plan as any).yearly_price || plan.price : plan.price}
                          </span>
                          <span className={`text-sm font-medium ${popular ? 'text-white/70' : 'text-muted-foreground'}`}>
                            / {billingPeriod === 'yearly' ? 'year' : plan.billing_period === 'trial' ? '7 days' : 'month'}
                          </span>
                        </div>
                        {billingPeriod === 'yearly' && plan.price > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-xs line-through ${popular ? 'text-white/40' : 'text-muted-foreground/60'}`}>
                              ₹{plan.price * 12}/yr
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${popular ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                              Save ₹{plan.price * 12 - ((plan as any).yearly_price || plan.price)}
                            </span>
                          </div>
                        )}
                        {billingPeriod === 'monthly' && plan.price > 0 && (
                          <p className={`text-xs mt-1 ${popular ? 'text-white/50' : 'text-muted-foreground'}`}>
                            or ₹{(plan as any).yearly_price || plan.price * 12}/yr (save more!)
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      <p className={`text-sm leading-relaxed ${popular ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {plan.price === 0
                          ? 'Get started for free with essential features to explore the platform.'
                          : popular
                          ? 'The perfect plan for growing institutions. Unlock advanced AI tools and automation.'
                          : 'Full-scale deployment for large organizations with premium features and dedicated support.'
                        }
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="px-8">
                      <div className={`h-px w-full ${popular ? 'bg-white/20' : 'bg-border/60'}`} />
                    </div>

                    {/* Features List */}
                    <div className="p-8 pt-6 flex-grow">
                      <ul className="space-y-3.5">
                        {features.map((feature) => (
                          <li key={feature.label} className={`flex items-center gap-3 ${!feature.enabled ? 'opacity-40' : ''}`}>
                            <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center ${
                              feature.enabled
                                ? (popular ? 'bg-white/20' : 'bg-primary/10')
                                : (popular ? 'bg-white/10' : 'bg-muted')
                            }`}>
                              {feature.enabled ? (
                                <Check className={`w-3 h-3 ${popular ? 'text-white' : 'text-primary'}`} />
                              ) : (
                                <X className={`w-3 h-3 ${popular ? 'text-white/40' : 'text-muted-foreground/50'}`} />
                              )}
                            </div>
                            <span className={`text-sm font-medium ${
                              feature.enabled
                                ? (popular ? 'text-white/90' : 'text-foreground/90')
                                : (popular ? 'text-white/30 line-through' : 'text-muted-foreground/50 line-through')
                            }`}>
                              {feature.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <div className="p-8 pt-2">
                      <Button
                        disabled={!!loading}
                        onClick={() => handlePurchase(plan)}
                        className={`w-full h-12 rounded-full font-bold text-sm tracking-wide transition-all duration-300 ${
                          popular
                            ? 'bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {loading === plan.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            {plan.price === 0 ? "Start Free Trial" : "Get started"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>

                      <p className={`text-center text-xs mt-3 font-medium ${popular ? 'text-white/50' : 'text-muted-foreground'}`}>
                        No credit card required
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};
