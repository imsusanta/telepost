import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Play, BookOpen, Zap, Settings, Users, BarChart3, Clock, ArrowRight } from "lucide-react";

const VideoTutorials = () => {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const categories = [
    {
      title: "Getting Started",
      icon: Zap,
      color: "emerald",
      tutorials: [
        { title: "Create Your First Quiz in 60 Seconds", duration: "2:15", level: "Beginner" },
        { title: "Connect Your Telegram Channel", duration: "3:42", level: "Beginner" },
        { title: "Dashboard Overview & Navigation", duration: "4:10", level: "Beginner" },
      ],
    },
    {
      title: "Quiz Creation",
      icon: BookOpen,
      color: "blue",
      tutorials: [
        { title: "AI-Powered Quiz Generation from Documents", duration: "5:30", level: "Intermediate" },
        { title: "Bulk Upload Questions from Excel/CSV", duration: "3:55", level: "Intermediate" },
        { title: "Custom Quiz Formatting & Styling", duration: "4:20", level: "Intermediate" },
      ],
    },
    {
      title: "Scheduling & Automation",
      icon: Clock,
      color: "purple",
      tutorials: [
        { title: "Set Up Auto-Publishing Schedules", duration: "3:18", level: "Intermediate" },
        { title: "Batch Scheduling for Entire Courses", duration: "5:12", level: "Advanced" },
        { title: "Time Zone Settings & Best Practices", duration: "2:45", level: "Beginner" },
      ],
    },
    {
      title: "Channel Management",
      icon: Users,
      color: "amber",
      tutorials: [
        { title: "Managing Multiple Telegram Channels", duration: "4:05", level: "Advanced" },
        { title: "Bot Permissions & Troubleshooting", duration: "3:30", level: "Intermediate" },
        { title: "Channel Analytics & Engagement Tips", duration: "5:48", level: "Advanced" },
      ],
    },
    {
      title: "Analytics & Reporting",
      icon: BarChart3,
      color: "rose",
      tutorials: [
        { title: "Understanding Your Quiz Performance", duration: "4:22", level: "Beginner" },
        { title: "Export Reports & Data", duration: "2:50", level: "Intermediate" },
        { title: "Optimizing Engagement with Analytics", duration: "6:15", level: "Advanced" },
      ],
    },
    {
      title: "Account & Settings",
      icon: Settings,
      color: "slate",
      tutorials: [
        { title: "Manage Your Subscription & Billing", duration: "2:30", level: "Beginner" },
        { title: "Team Members & Permissions", duration: "3:45", level: "Advanced" },
        { title: "API Integration & Webhooks", duration: "7:10", level: "Advanced" },
      ],
    },
  ];

  const levelColors: Record<string, string> = {
    Beginner: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/50",
    Intermediate: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200/50",
    Advanced: "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200/50",
  };

  const iconColorMap: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
    slate: "bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400",
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation onGetStarted={handleGetStarted} />

      <main className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-20 w-full">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Header */}
          <div className="mb-12 border-b border-border/60 pb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-4 border border-purple-200/50">
              <Play className="w-3.5 h-3.5" />
              <span>Learn TelePost</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Video Tutorials
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Step-by-step video guides to help you master every feature of TelePost. From first quiz to advanced automation.
            </p>
          </div>

          {/* Stats Banner */}
          <div className="mb-10 p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200/40 dark:border-purple-800/40 grid grid-cols-3 gap-4 text-center not-prose">
            <div>
              <p className="text-2xl font-bold text-foreground">18+</p>
              <p className="text-xs text-muted-foreground">Tutorials</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">6</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">~75 min</p>
              <p className="text-xs text-muted-foreground">Total Watch Time</p>
            </div>
          </div>

          {/* Tutorial Categories */}
          <div className="space-y-8 not-prose">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <section key={category.title} className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border/40 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${iconColorMap[category.color]} flex items-center justify-center`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <h2 className="font-bold text-foreground text-lg m-0">{category.title}</h2>
                    <span className="ml-auto text-xs text-muted-foreground">{category.tutorials.length} videos</span>
                  </div>
                  <div className="divide-y divide-border/40">
                    {category.tutorials.map((tutorial, idx) => (
                      <div
                        key={idx}
                        className="group p-4 px-6 flex items-center gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{tutorial.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{tutorial.duration}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelColors[tutorial.level]}`}>
                              {tutorial.level}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Coming Soon CTA */}
          <section className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10 text-center not-prose">
            <Play className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Video Library Coming Soon</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              We're recording high-quality video tutorials for every feature. In the meantime, check out our Help Center for written guides or reach out to support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/help-center"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity no-underline"
              >
                Visit Help Center
              </a>
              <a
                href="/contact-support"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-card border border-border font-semibold text-sm text-foreground hover:bg-muted/50 transition-colors no-underline"
              >
                Contact Support
              </a>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default VideoTutorials;
