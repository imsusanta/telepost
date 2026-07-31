import { School, UserCheck, Megaphone, GraduationCap, Users, BarChart3, User, Clock, ShieldCheck, Target, Rocket, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export const UseCases = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const cards = [
    {
      title: "Coaching Institutes",
      description: "Automate daily quiz posting and engage thousands of students effortlessly.",
      icon: School,
      bg: "bg-sky-100 dark:bg-sky-950/60 text-[#0088cc]",
      divider: "bg-[#0088cc]",
      btnBg: "bg-sky-50 dark:bg-sky-950/50 text-[#0088cc] group-hover:bg-[#0088cc] group-hover:text-white",
      hoverBorder: "hover:border-[#0088cc]/40",
    },
    {
      title: "Teachers & Educators",
      description: "Create exam-quality quizzes in minutes without any manual work.",
      icon: UserCheck,
      bg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
      divider: "bg-emerald-500",
      btnBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
      hoverBorder: "hover:border-emerald-500/40",
    },
    {
      title: "Telegram Education Channels",
      description: "Keep your channel active with scheduled quizzes that students love.",
      icon: Megaphone,
      bg: "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
      divider: "bg-purple-500",
      btnBg: "bg-purple-50 dark:bg-purple-950/50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
      hoverBorder: "hover:border-purple-500/40",
    },
    {
      title: "Exam Preparation Platforms",
      description: "Perfect for UPSC, SSC, Banking, NEET, JEE, State PSC, and other competitive exams.",
      icon: GraduationCap,
      bg: "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
      divider: "bg-amber-500",
      btnBg: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
      hoverBorder: "hover:border-amber-500/40",
    },
  ];

  return (
    <section
      id="use-cases"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-background via-muted/10 to-background"
      aria-labelledby="use-cases-heading"
    >
      {/* Background Floating Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#0088cc]/5 rounded-full blur-[140px]" />

        {/* Left Side: Wave Line + Bar Chart & Users Badges */}
        <div className="hidden lg:block absolute left-[5%] top-[16%] space-y-4">
          <div className="w-11 h-11 rounded-full bg-purple-100/80 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-md animate-float border border-purple-200/50">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="w-9 h-9 rounded-full bg-sky-100/80 dark:bg-sky-950/60 text-[#0088cc] flex items-center justify-center shadow-md ml-5 animate-float-slow border border-sky-200/50">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Right Side: 3D Paperplane + User Badge */}
        <div className="hidden lg:block absolute right-[5%] top-[12%] text-[#0088cc]">
          <div className="w-9 h-9 rounded-full bg-rose-100/80 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center shadow-md ml-auto mb-6 animate-float">
            <User className="w-4.5 h-4.5" />
          </div>
          {/* Floating Paperplane with dashed curve */}
          <svg className="w-56 h-56 text-[#0088cc]" viewBox="0 0 240 240" fill="none">
            <path d="M 20 180 C 10 90, 90 40, 110 100 C 130 160, 50 160, 60 110 C 70 60, 140 30, 200 45" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.25" fill="none" />
            <g transform="translate(190, 20) rotate(-15) scale(1.5)">
              <path d="M 2.01 21 L 23 12 L 2.01 3 L 2 10 L 17 12 L 2 14 Z" fill="url(#uc-plane-grad)" />
              <defs>
                <linearGradient id="uc-plane-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#38bdf8" />
                  <stop offset="1" stopColor="#0088cc" />
                </linearGradient>
              </defs>
            </g>
          </svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Top Pill Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200/60 bg-sky-50 dark:bg-sky-950/50 text-xs sm:text-sm font-semibold text-[#0088cc] mb-6 shadow-sm">
            <Users className="w-3.5 h-3.5" />
            <span>Built for Educators</span>
          </div>

          {/* Main Headline */}
          <h2
            id="use-cases-heading"
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground tracking-tight mb-4"
          >
            Who Is TelePost{" "}
            <span className="text-purple-600 dark:text-purple-400">Built </span>
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">For?</span>
          </h2>

          {/* Subheadline - Exactly 3 lines */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-center leading-relaxed">
            Whether you run a coaching institute, teach students, or manage
            <br className="hidden sm:block" />
            a Telegram education channel, TelePost helps you create, schedule,
            <br className="hidden sm:block" />
            and publish quizzes in minutes.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 items-stretch">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`p-8 sm:p-9 rounded-[28px] bg-card border border-border/60 shadow-sm hover:shadow-md ${card.hoverBorder} transition-all flex flex-col justify-between items-center text-center group h-full min-h-[330px] relative overflow-hidden`}
              >
                {/* Top Circular Graphic Icon */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shrink-0 transition-transform duration-300 group-hover:scale-105 ${card.bg}`}>
                  <Icon className="w-9 h-9" />
                </div>

                {/* Title, Accent Line & Description */}
                <div className="w-full flex-1 flex flex-col items-center justify-start">
                  <h3 className="text-lg font-bold text-foreground mb-1 leading-snug min-h-[44px] flex items-center justify-center">
                    {card.title}
                  </h3>
                  <div className={`w-8 h-1 ${card.divider} rounded-full mx-auto my-3`} />
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
                    {card.description}
                  </p>
                </div>

                {/* Bottom Arrow Action Button */}
                <div className="mt-6 pt-1 shrink-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300 ${card.btnBg}`}>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom 4-Metric Bar Card from Screenshot */}
        <div className="bg-card/90 backdrop-blur-md rounded-3xl border border-border/60 shadow-lg p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {/* Metric 1 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pr-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-[#0088cc] flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Save Hours Every Week</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Automate repetitive tasks and focus on what matters.
                </p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">100% Reliable</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Built for reliability with advanced error handling.
                </p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Better Engagement</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Increase participation with interactive quizzes.
                </p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Boost Performance</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                  Data-driven insights to improve learning outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
