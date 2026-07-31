import { Zap, Send, FileText, BarChart3, Database, Users, ShieldCheck, Clock, Target, Rocket, ArrowRight, Check, Folder } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export const Features = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section
      id="features"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-background via-muted/15 to-background"
      aria-labelledby="features-heading"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Soft background ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-[#0088cc]/5 rounded-full blur-[140px]" />

        {/* Left Side: Floating Paperplane + Dashed Trail */}
        <div className="hidden lg:block absolute left-[2%] top-[12%] text-[#0088cc]">
          <svg className="w-56 h-56" viewBox="0 0 240 240" fill="none">
            <path d="M 20 180 C 10 90, 90 40, 110 100 C 130 160, 50 160, 60 110 C 70 60, 140 30, 200 45" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" opacity="0.35" fill="none" />
            <g transform="translate(195, 30) rotate(-20) scale(1.2)">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
            </g>
          </svg>
        </div>

        {/* Right Side: Floating Bar Chart & Users Badge */}
        <div className="hidden lg:block absolute right-[6%] top-[12%] space-y-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-md animate-float">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-md ml-8 animate-float-slow">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200/60 bg-sky-50 dark:bg-sky-950/50 text-xs sm:text-sm font-semibold text-[#0088cc] mb-6">
            <Zap className="w-3.5 h-3.5 fill-[#0088cc]" />
            <span>Powerful Features</span>
          </div>

          <h2
            id="features-heading"
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground tracking-tight mb-4"
          >
            Everything You Need for{" "}
            <span className="text-purple-600 dark:text-purple-400">Telegram </span>
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Automation</span>
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Save hours every week and skyrocket student engagement with powerful features
          </p>
        </div>

        {/* Top 2 Large Bento Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Card 1: 30-Second Quiz Posting */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-sky-50/90 via-card to-sky-50/40 dark:from-sky-950/30 dark:to-card border border-sky-100 dark:border-sky-900/40 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start gap-6 relative overflow-hidden group min-h-[220px]">
            <div className="flex-1 z-10 max-w-sm">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-[#0088cc] flex items-center justify-center mb-6 shadow-sm">
                <Zap className="w-5 h-5 fill-[#0088cc]" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">30-Second Quiz Posting</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                From question to Telegram in just 30 seconds. The fastest automation experience in the industry.
              </p>
            </div>

            {/* Fastest in Industry Badge */}
            <div className="absolute top-6 right-6 z-20">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/60 text-[#0088cc] text-xs font-bold border border-sky-200/50">
                <Zap className="w-3 h-3 fill-[#0088cc]" />
                Fastest in Industry
              </span>
            </div>

            {/* 3D Blue Stopwatch Speed Graphic */}
            <div className="self-end sm:self-center shrink-0 z-10 mt-4 sm:mt-0 relative pr-2">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Speed motion lines on left */}
                <div className="absolute left-[-20px] space-y-1.5 opacity-80">
                  <div className="w-8 h-1 bg-[#0088cc] rounded-full animate-pulse" />
                  <div className="w-12 h-1 bg-[#0088cc] rounded-full animate-pulse delay-75" />
                  <div className="w-6 h-1 bg-[#0088cc] rounded-full animate-pulse delay-150" />
                </div>
                {/* 3D Speed Clock SVG */}
                <svg className="w-24 h-24 text-[#0088cc] drop-shadow-xl" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="54" r="38" stroke="currentColor" strokeWidth="7" fill="white" className="dark:fill-slate-900" />
                  {/* Top Stopwatch Knob */}
                  <rect x="44" y="6" width="12" height="10" rx="3" fill="currentColor" />
                  <rect x="47" y="2" width="6" height="6" rx="2" fill="currentColor" />
                  {/* Clock Hands */}
                  <path d="M50 54 L50 28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  <path d="M50 54 L68 40" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="50" cy="54" r="5" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2: Native Telegram Experience */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-50/90 via-card to-purple-50/40 dark:from-purple-950/30 dark:to-card border border-purple-100 dark:border-purple-900/40 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start gap-6 relative overflow-hidden group min-h-[220px]">
            <div className="flex-1 z-10 max-w-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 shadow-sm">
                <Send className="w-5 h-5 fill-purple-600 dark:fill-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Native Telegram Experience</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Students answer directly in Telegram. Interactive polls with real-time feedback and results.
              </p>
            </div>

            {/* Graphic Illustration: Mobile Frame with Telegram Poll */}
            <div className="self-end sm:self-center shrink-0 z-10 mt-4 sm:mt-0 relative rotate-6 translate-x-2 translate-y-2">
              <div className="w-36 bg-[#0f172a] rounded-2xl p-2.5 border border-purple-300/40 shadow-xl text-[10px] text-white">
                <div className="flex items-center gap-1 mb-1 font-bold text-[#38bdf8]">
                  <Send className="w-2.5 h-2.5 fill-[#38bdf8]" />
                  <span>Quiz Time! 📝</span>
                </div>
                <p className="text-[9px] text-slate-300 mb-2 leading-tight">What is the capital of India?</p>
                <div className="space-y-1 text-[8px]">
                  <div className="px-2 py-1 rounded bg-slate-800 text-slate-300">A. Mumbai</div>
                  <div className="px-2 py-1 rounded bg-[#059669]/40 text-[#34d399] font-bold flex justify-between items-center">
                    <span>B. New Delhi</span>
                    <Check className="w-2.5 h-2.5 text-[#34d399]" />
                  </div>
                  <div className="px-2 py-1 rounded bg-slate-800 text-slate-300">C. Kolkata</div>
                  <div className="px-2 py-1 rounded bg-slate-800 text-slate-300">D. Chennai</div>
                </div>
              </div>
              {/* 3D Paperplane badge popping out */}
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg animate-bounce">
                <Send className="w-4 h-4 fill-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Middle 4 Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          
          {/* Card 1: AI Question Generator */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-[#0088cc]/30 transition-all flex flex-col justify-between group min-h-[220px] relative overflow-hidden">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-[#0088cc] flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">AI Question Generator</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload your PDF or paste text, get questions instantly. No more manual typing hassle.
              </p>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between mt-6 pt-2">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-[#0088cc] group-hover:text-[#0088cc] transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              {/* PDF Document Graphic */}
              <div className="w-10 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative shadow-sm">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="bg-red-500 text-white text-[7px] font-extrabold px-1 rounded absolute bottom-1">PDF</span>
              </div>
            </div>
          </div>

          {/* Card 2: Real-time Analytics */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all flex flex-col justify-between group min-h-[220px] relative overflow-hidden">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">Real-time Analytics</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                See who answered, track accuracy rates, all in real-time. Monitor student performance effortlessly.
              </p>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between mt-6 pt-2">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-emerald-500 group-hover:text-emerald-500 transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              {/* Green Line Chart Graphic */}
              <svg className="w-14 h-8 text-emerald-500" viewBox="0 0 60 30" fill="none">
                <path d="M 5 25 L 20 18 L 35 22 L 55 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="55" cy="5" r="3" fill="currentColor" />
                <circle cx="35" cy="22" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Card 3: Smart Question Bank */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all flex flex-col justify-between group min-h-[220px] relative overflow-hidden">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">Smart Question Bank</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Organize questions by subject and topic. Create once, reuse forever across multiple quizzes.
              </p>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between mt-6 pt-2">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-amber-500 group-hover:text-amber-500 transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              {/* Folder with papers Graphic */}
              <div className="relative text-amber-500">
                <Folder className="w-9 h-9 fill-amber-300/40 text-amber-500" />
                <div className="absolute -top-1 right-0 w-5 h-5 rounded bg-amber-200 border border-amber-300 rotate-12 -z-10" />
              </div>
            </div>
          </div>

          {/* Card 4: Multi-Channel Support */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all flex flex-col justify-between group min-h-[220px] relative overflow-hidden">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">Multi-Channel Support</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Manage multiple Telegram channels from one dashboard. Perfect for coaching institutes and schools.
              </p>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between mt-6 pt-2">
              <div className="w-7 h-7 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground group-hover:border-purple-500 group-hover:text-purple-500 transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
              {/* Overlapping Telegram Paperplane Badges */}
              <div className="flex -space-x-2 text-white">
                <div className="w-6 h-6 rounded-full bg-[#0088cc] flex items-center justify-center border-2 border-card shadow-sm">
                  <Send className="w-3 h-3 fill-white" />
                </div>
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center border-2 border-card shadow-sm">
                  <Send className="w-3 h-3 fill-white" />
                </div>
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-card shadow-sm">
                  <Send className="w-3 h-3 fill-white" />
                </div>
              </div>
            </div>
          </div>
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
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Automate repetitive tasks and focus on what matters.</p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">100% Reliable</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Built for reliability with advanced error handling.</p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Better Engagement</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Increase participation with interactive quizzes and instant results.</p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Boost Performance</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Data-driven insights to improve learning outcomes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
