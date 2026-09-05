import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, CheckCircle } from "lucide-react";

const RefundPolicy = () => {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation onGetStarted={handleGetStarted} />

      <main className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-20 w-full">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Header Banner */}
          <div className="mb-12 border-b border-border/60 pb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4 border border-emerald-200/50">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Transparent Billing</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Refund & Cancellation Policy
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            At TelePost, we aim to provide exceptional AI quiz automation tools for educators, coaching institutes, and Telegram channel owners. This policy outlines our refund rules, cancellation rights, and billing guidelines.
          </p>

          {/* Section 1 */}
          <section className="mb-10 p-6 rounded-2xl bg-card border border-border/60 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">1</div>
              <h2 className="text-xl font-bold text-foreground m-0">7-Day Free Trial</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed m-0">
              Every new TelePost account includes a 7-day free trial without requiring credit card details upfront. You are free to test AI generation, Telegram channel integrations, and automated schedulers before making any payment decision. Signup requires an invitation code.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Subscription Cancellations</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can cancel your active paid plan at any time directly from your <strong>Dashboard Settings &gt; Billing</strong> page:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Upon cancellation, your subscription will remain active until the end of your current billing period.</li>
              <li>You will not be billed for subsequent billing cycles following your cancellation request.</li>
              <li>No cancellation fees apply at any time.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Refund Eligibility Criteria</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Refund requests are considered and granted under the following conditions:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 font-bold text-foreground mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Technical System Failures</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If platform downtime or technical bugs prevent quiz delivery or AI generation for over 48 consecutive hours.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/60">
                <div className="flex items-center gap-2 font-bold text-foreground mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Duplicate Billing</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If an accidental double charge occurs due to payment gateway network drops or glitches.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">4. Refund Processing Timeline</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Approved refunds are credited back to your original payment method (Credit/Debit Card, UPI, Net Banking via Razorpay) within <strong>5 to 7 business days</strong>.
            </p>
          </section>

          {/* Section 5: Contact */}
          <section className="p-6 rounded-2xl bg-gradient-to-br from-sky-50/70 via-card to-purple-50/50 dark:from-sky-950/30 dark:to-purple-950/30 border border-sky-200/60 dark:border-sky-900/40">
            <h3 className="text-xl font-bold text-foreground mb-2">Need Assistance with Your Billing?</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              If you have any questions regarding your invoice, subscription, or wish to submit a refund request, reach out to our dedicated support team:
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
              <a href="mailto:support@telepost.tech" className="text-[#0088cc] hover:underline">
                📧 support@telepost.tech
              </a>
              <span className="text-muted-foreground">&bull;</span>
              <a href="https://wa.me/918927093059" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                💬 WhatsApp Support (+91 8927093059)
              </a>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default RefundPolicy;
