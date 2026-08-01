import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LifeBuoy, BookOpen, Zap, Shield, CreditCard, Users, Bot, FileText, ArrowRight, MessageCircle, Search } from "lucide-react";
import { useState } from "react";

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleGetStarted = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const helpCategories = [
    {
      icon: Zap,
      title: "Getting Started",
      description: "Account setup, onboarding, and your first quiz",
      color: "emerald",
      articles: [
        "How to create your TelePost account",
        "Connecting your first Telegram channel",
        "Creating your first AI-powered quiz",
        "Understanding the dashboard layout",
      ],
    },
    {
      icon: Bot,
      title: "Telegram Bot Setup",
      description: "Bot configuration, permissions, and troubleshooting",
      color: "blue",
      articles: [
        "Adding @TelePostBot to your channel",
        "Required bot admin permissions",
        "Troubleshooting bot connection issues",
        "Multiple channels with one bot",
      ],
    },
    {
      icon: BookOpen,
      title: "Quiz & Content",
      description: "Creating, editing, and managing your quizzes",
      color: "purple",
      articles: [
        "AI quiz generation from documents",
        "Manual quiz creation guide",
        "Bulk import from Excel/CSV",
        "Question bank management",
      ],
    },
    {
      icon: FileText,
      title: "Scheduling & Publishing",
      description: "Automate your content delivery pipeline",
      color: "amber",
      articles: [
        "Setting up auto-publish schedules",
        "Time zone configuration",
        "Batch scheduling for courses",
        "Pausing and resuming schedules",
      ],
    },
    {
      icon: CreditCard,
      title: "Billing & Subscription",
      description: "Plans, payments, invoices, and refunds",
      color: "rose",
      articles: [
        "Available plans and pricing",
        "How to upgrade or downgrade",
        "Payment methods accepted",
        "Requesting a refund",
      ],
    },
    {
      icon: Shield,
      title: "Account & Security",
      description: "Profile settings, passwords, and data privacy",
      color: "slate",
      articles: [
        "Changing your email or password",
        "Two-factor authentication",
        "Data export and deletion",
        "Privacy and data security overview",
      ],
    },
  ];

  const iconColorMap: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
    slate: "bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400",
  };

  const filteredCategories = searchQuery
    ? helpCategories.filter(
        (cat) =>
          cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cat.articles.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : helpCategories;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation onGetStarted={handleGetStarted} />

      <main className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-20 w-full">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Header */}
          <div className="mb-12 border-b border-border/60 pb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-4 border border-amber-200/50">
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Knowledge Base</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Help Center
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Find answers, guides, and troubleshooting tips for everything TelePost.
            </p>
          </div>

          {/* Search */}
          <div className="mb-10 not-prose">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-card border border-border/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Quick Links */}
          <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 border border-amber-200/40 dark:border-amber-800/40 not-prose">
            <p className="font-semibold text-foreground text-sm mb-3">Popular Topics</p>
            <div className="flex flex-wrap gap-2">
              {["Connect Telegram", "Create Quiz", "Billing", "Bot Setup", "Schedule Posts", "Refund"].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSearchQuery(topic)}
                  className="px-3 py-1.5 rounded-lg bg-card border border-border/60 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid gap-4 sm:grid-cols-2 not-prose mb-12">
            {filteredCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.title}
                  className="group p-6 rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl ${iconColorMap[category.color]} flex items-center justify-center`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base m-0">{category.title}</h3>
                      <p className="text-muted-foreground text-xs m-0">{category.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {category.articles.map((article, idx) => (
                      <li key={idx} className="flex items-center gap-2 group/item cursor-pointer">
                        <ArrowRight className="w-3 h-3 text-muted-foreground group-hover/item:text-primary transition-colors shrink-0" />
                        <span className="text-sm text-muted-foreground group-hover/item:text-foreground transition-colors">
                          {article}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 not-prose">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-semibold mb-1">No results found</p>
              <p className="text-muted-foreground text-sm">Try a different search term or browse the categories above.</p>
            </div>
          )}

          {/* Contact Support CTA */}
          <section className="p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-amber-500/5 border border-primary/10 text-center not-prose">
            <MessageCircle className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Can't Find What You Need?</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Our support team is just a message away. Reach out via WhatsApp or email and we'll help you personally.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/contact-support"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity no-underline"
              >
                Contact Support
              </a>
              <a
                href="/video-tutorials"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card border border-border font-semibold text-sm text-foreground hover:bg-muted/50 transition-colors no-underline"
              >
                Watch Tutorials
              </a>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
