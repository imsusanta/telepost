import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Lock, Database, Key, Cpu, CheckCircle2 } from "lucide-react";

const DataSecurity = () => {
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const securityFeatures = [
    {
      icon: Lock,
      title: "HTTPS in transit",
      desc: "The TelePost web app and APIs are served over HTTPS (TLS). We do not claim a SOC 2 report or end-to-end encryption of the dashboard.",
    },
    {
      icon: Database,
      title: "Row Level Security (RLS)",
      desc: "Database isolation via Supabase RLS policies is designed so your channels, quizzes, and related data are only readable by your account (or staff using the service role for operations you request).",
    },
    {
      icon: Key,
      title: "Bot tokens stay off the public client",
      desc: "Telegram bot tokens are stored in the backend database and used by server-side functions. They are not meant to be exposed in public client bundles.",
    },
    {
      icon: Cpu,
      title: "AI processing for your quizzes",
      desc: "Uploaded PDFs and study text are sent to AI providers only to generate quizzes for your account. We do not sell your materials. We are not SOC 2 certified.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation onGetStarted={handleGetStarted} />

      <main className="flex-1 max-w-4xl mx-auto px-4 pt-32 pb-20 w-full">
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Header Banner */}
          <div className="mb-12 border-b border-border/60 pb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/50 text-[#0088cc] text-xs font-semibold mb-4 border border-sky-200/50">
              <ShieldCheck className="w-4 h-4" />
              <span>How we protect your data</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Data Security & Infrastructure
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            At TelePost, we take care of educator content and Telegram channel credentials. Here is what we actually do today — without claiming certifications we do not hold.
          </p>

          {/* Security Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 not-prose">
            {securityFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-6 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-[#0088cc] flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Infrastructure Section */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Infrastructure & Hosting Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              TelePost is hosted on Supabase (PostgreSQL with Row Level Security) and a standard web host for the frontend:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Supabase provides managed Postgres, backups, and encryption at rest on its infrastructure.</li>
              <li>Application traffic uses HTTPS. We do not currently publish a SOC 2 report or a public status page.</li>
              <li>Access to another customer’s quizzes or channels is blocked by RLS policies, not by marketing claims.</li>
            </ul>
          </section>

          {/* AI Privacy Section */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. AI & Document Privacy Guarantee</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you upload a PDF or paste question text into TelePost AI Generator:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Content is sent to AI providers to generate questions for your account.</li>
              <li>We do not sell original study documents to third parties.</li>
              <li>You keep intellectual property rights over materials you upload and quizzes you generate, subject to our Terms.</li>
            </ul>
          </section>

          {/* User Control & Deletion */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Data Retention & Right to Erasure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain total control over your data. You can delete questions, channels, or request permanent account erasure at any time. Upon account deletion, all associated channel tokens, test history, and user data are purged permanently from our database servers within 48 hours.
            </p>
          </section>

          {/* Security Contact */}
          <section className="p-6 rounded-2xl bg-gradient-to-br from-sky-50/70 via-card to-purple-50/50 dark:from-sky-950/30 dark:to-purple-950/30 border border-sky-200/60 dark:border-sky-900/40">
            <h3 className="text-xl font-bold text-foreground mb-2">Security Audits & Disclosure</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Have a security question, vulnerability report, or compliance inquiry? Contact our security team directly:
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0088cc]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>security@telepost.tech</span>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default DataSecurity;
