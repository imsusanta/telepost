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
      title: "AES-256 & TLS 1.3 Encryption",
      desc: "All data at rest is protected with military-grade AES-256 encryption. Data in transit is secured using HTTPS & TLS 1.3 protocols.",
    },
    {
      icon: Database,
      title: "Strict Row Level Security (RLS)",
      desc: "Database isolation via Supabase RLS policies ensures that your channels, quizzes, and student data are only accessible by you.",
    },
    {
      icon: Key,
      title: "Encrypted Bot Token Storage",
      desc: "Telegram bot tokens and API keys are stored in encrypted vaults and never exposed in client-side bundles or public endpoints.",
    },
    {
      icon: Cpu,
      title: "Private AI Model Processing",
      desc: "Uploaded PDFs and study materials processed by our AI model are used solely for quiz generation and are never used to train public models.",
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
              <span>Enterprise-Grade Security</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Data Security & Infrastructure
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            At TelePost, security is built into our core foundation. We understand that educators, coaching institutes, and creators trust us with their proprietary study material and Telegram channels. Here is how we keep your data secure.
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
              TelePost runs on enterprise-grade cloud infrastructure powered by Supabase (PostgreSQL with Row Level Security) and global edge networks:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Automatic automated backups with point-in-time recovery capabilities.</li>
              <li>DDoS protection, Web Application Firewalls (WAF), and rate limiting on all API endpoints.</li>
              <li>Strict CORS policies and Content Security Headers enforced on client builds.</li>
            </ul>
          </section>

          {/* AI Privacy Section */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. AI & Document Privacy Guarantee</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you upload a PDF or paste question text into TelePost AI Generator:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>Your content is processed strictly in-memory during question generation.</li>
              <li>No original study documents are shared with third parties or retained for public LLM training.</li>
              <li>You maintain 100% intellectual property rights over all generated quizzes and questions.</li>
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
