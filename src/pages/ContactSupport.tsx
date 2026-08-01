import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Mail, Clock, Headphones, Send, HelpCircle, ArrowRight } from "lucide-react";

const ContactSupport = () => {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const supportChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp Support",
      description: "Get instant help from our team via WhatsApp. Available during business hours for quick resolutions.",
      action: "Chat on WhatsApp",
      href: "https://wa.me/918927093059?text=Hi%20TelePost%20Team%2C%20I%20need%20help%20with...",
      color: "emerald",
    },
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us a detailed message and our team will respond within 24 hours with a thorough solution.",
      action: "Send Email",
      href: "mailto:support@telepost.in",
      color: "blue",
    },
    {
      icon: Headphones,
      title: "Live Chat",
      description: "Chat with our support agents in real-time through the in-app chat widget on your dashboard.",
      action: "Open Dashboard",
      href: "/dashboard",
      color: "purple",
    },
  ];

  const faqs = [
    {
      question: "How do I connect my Telegram channel?",
      answer: "Go to Dashboard → Channels, click 'Add Channel', and follow the bot setup wizard. You'll need to add @TelePostBot as an admin to your channel.",
    },
    {
      question: "Why aren't my quizzes being published?",
      answer: "Check that your bot has admin permissions in the channel, your subscription is active, and the scheduled time hasn't passed. Visit Settings → Billing to verify your plan status.",
    },
    {
      question: "Can I get a refund?",
      answer: "Yes, we offer refunds within 7 days of payment if you're unsatisfied. Visit our Refund Policy page for full details or contact our support team.",
    },
    {
      question: "How do I upgrade my plan?",
      answer: "Navigate to Dashboard → Settings → Billing. Select your desired plan and complete the payment. Your upgrade takes effect immediately.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use end-to-end encryption, SOC 2 compliant infrastructure, and never share your data with third parties. Read our Data Security page for more.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation onGetStarted={handleGetStarted} />

      <main className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-20 w-full">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Header */}
          <div className="mb-12 border-b border-border/60 pb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4 border border-blue-200/50">
              <Headphones className="w-3.5 h-3.5" />
              <span>We're Here to Help</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Contact Support
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Have a question or running into an issue? Our dedicated support team is ready to assist you.
            </p>
          </div>

          {/* Response Time Banner */}
          <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200/40 dark:border-blue-800/40 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground m-0 text-sm">Average Response Time</p>
              <p className="text-muted-foreground text-sm m-0">We typically respond within <strong className="text-foreground">2-4 hours</strong> during business hours (Mon-Sat, 10 AM – 7 PM IST).</p>
            </div>
          </div>

          {/* Support Channels */}
          <h2 className="text-2xl font-bold text-foreground mb-6">Get in Touch</h2>
          <div className="grid gap-4 sm:grid-cols-3 not-prose mb-12">
            {supportChannels.map((channel) => {
              const Icon = channel.icon;
              const colorMap: Record<string, string> = {
                emerald: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
                blue: "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
                purple: "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
              };
              return (
                <a
                  key={channel.title}
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group p-6 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 flex flex-col no-underline"
                >
                  <div className={`w-10 h-10 rounded-xl ${colorMap[channel.color]} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-2">{channel.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-4">{channel.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all duration-200">
                    {channel.action}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </a>
              );
            })}
          </div>

          {/* FAQs */}
          <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 not-prose mb-12">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group p-5 rounded-2xl bg-card border border-border/60 shadow-sm cursor-pointer"
              >
                <summary className="flex items-center gap-3 font-semibold text-foreground text-sm list-none [&::-webkit-details-marker]:hidden">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1">{faq.question}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90 shrink-0" />
                </summary>
                <p className="mt-3 ml-7 text-muted-foreground text-sm leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>

          {/* Still Need Help */}
          <section className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10 text-center">
            <Send className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2 mt-0">Still Need Help?</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              If you couldn't find what you're looking for, reach out directly on WhatsApp and we'll get back to you as soon as possible.
            </p>
            <a
              href="https://wa.me/918927093059?text=Hi%20TelePost%20Team%2C%20I%20need%20help%20with..."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity no-underline"
            >
              <MessageCircle className="w-4 h-4" />
              Chat on WhatsApp
            </a>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default ContactSupport;
