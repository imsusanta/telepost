import { useInView } from "@/hooks/useInView";
import { Send, Check, Users, Clock, MessageCircle, Zap, ShieldCheck, BarChart3, ClipboardList, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";

export const TelegramDemo = () => {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [step, setStep] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Animation sequence
  useEffect(() => {
    if (!isInView) {
      setStep(0);
      setShowAnswer(false);
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    timers.push(setTimeout(() => setStep(1), 400));
    timers.push(setTimeout(() => setStep(2), 1200));
    timers.push(setTimeout(() => setStep(3), 2000));
    timers.push(setTimeout(() => setShowAnswer(true), 2800));
    timers.push(setTimeout(() => setStep(4), 3600));

    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-background via-muted/20 to-background"
      aria-label="Live Demo Section"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Soft background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#0088cc]/5 rounded-full blur-[150px]" />

        {/* Top-Left Floating Paperplane & Dashed Trail (Attached Together) */}
        <div className="hidden lg:block absolute left-[3%] top-[10%] pointer-events-none text-[#0088cc]">
          <svg className="w-56 h-56" viewBox="0 0 240 240" fill="none">
            <path d="M 20 180 C 10 90, 90 40, 110 100 C 130 160, 50 160, 60 110 C 70 60, 140 30, 200 45" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" opacity="0.35" />
            {/* Paper plane icon attached seamlessly to trail tip */}
            <g transform="translate(195, 30) rotate(-20) scale(1.2)">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
            </g>
          </svg>
        </div>

        {/* Top-Right Decorative Sparkles */}
        <div className="hidden lg:block absolute right-[8%] top-[18%] pointer-events-none">
          <svg className="w-16 h-16 text-pink-400 opacity-60 animate-pulse" viewBox="0 0 100 100" fill="currentColor">
            <path d="M0 50 C 35 50, 50 35, 50 0 C 50 35, 65 50, 100 50 C 65 50, 50 65, 50 100 C 50 65, 35 50, 0 50 Z" />
          </svg>
          <svg className="w-10 h-10 text-amber-400 opacity-60 ml-8 -mt-2 animate-ping" viewBox="0 0 100 100" fill="currentColor">
            <path d="M0 50 C 35 50, 50 35, 50 0 C 50 35, 65 50, 100 50 C 65 50, 50 65, 50 100 C 50 65, 35 50, 0 50 Z" />
          </svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#0088cc]/30 bg-[#0088cc]/5 backdrop-blur-sm text-xs sm:text-sm font-semibold text-[#0088cc] mb-6 animate-fade-up">
            <Send className="w-3.5 h-3.5 fill-[#0088cc]" />
            <span>Live Preview</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground tracking-tight mb-4">
            Watch It <span className="text-purple-600 dark:text-purple-400">In </span>
            <span className="text-gradient-primary bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Action</span>
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            See how your quiz reaches students in real-time on Telegram
          </p>
        </div>

        {/* Top Pill Labels */}
        <div className="flex justify-between items-center max-w-4xl mx-auto px-4 sm:px-12 mb-4">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-[#0284c7] dark:text-sky-300 font-semibold text-xs sm:text-sm shadow-sm">
            Your Dashboard
          </div>
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 font-semibold text-xs sm:text-sm shadow-sm">
            Student's Telegram
          </div>
        </div>

        {/* Interactive Dual Windows Demo Area */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 max-w-5xl mx-auto mb-16">
          
          {/* Left Window: Your Dashboard */}
          <div className="w-full lg:w-[420px] bg-card rounded-3xl border border-border/60 shadow-xl overflow-hidden p-1 transition-all duration-500 hover:shadow-2xl">
            {/* Browser Control Bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-muted/40 border-b border-border/40 rounded-t-2xl">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>

            {/* Dashboard Content */}
            <div className="p-5 space-y-3.5 bg-card">
              {/* Item 1: Quiz Ready */}
              <div className={`p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex items-start gap-3 transition-all duration-500 ${
                step >= 1 ? "opacity-100 translate-y-0" : "opacity-40 translate-y-2"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-[#0088cc] flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Quiz Ready</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">What is the capital of India?</p>
                </div>
              </div>

              {/* Item 2: Channel Selected */}
              <div className={`p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-start gap-3 transition-all duration-500 ${
                step >= 2 ? "opacity-100 translate-y-0" : "opacity-40 translate-y-2"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 relative">
                  <Megaphone className="w-5 h-5" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0088cc] flex items-center justify-center text-white">
                    <Send className="w-2.5 h-2.5 fill-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Channel Selected</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">GK Practice Channel</p>
                </div>
              </div>

              {/* Item 3: Post Button */}
              <div className={`transition-all duration-500 ${
                step >= 3 ? "opacity-100 scale-100" : "opacity-50 scale-98"
              }`}>
                <button className="w-full py-3.5 px-5 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0088cc]/20 transition-all">
                  <Send className="w-4 h-4 fill-white" />
                  <span>Post to Telegram</span>
                  <Check className="w-4 h-4 ml-auto stroke-[3]" />
                </button>
              </div>

              {/* Item 4: Success Message */}
              <div className={`p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 transition-all duration-500 ${
                step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              }`}>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Posted Successfully!</h4>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">1,234 students reached</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Connection Bridge: Instant Delivery */}
          <div className="flex lg:flex-col items-center justify-center gap-3 py-4 lg:py-0 shrink-0">
            {/* Left/Top Dotted Line */}
            <div className="flex items-center gap-1.5 text-[#0088cc]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0088cc]/60 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>

            {/* Central Badge */}
            <div className="w-14 h-14 rounded-full bg-white dark:bg-card border border-border/80 shadow-xl flex items-center justify-center text-[#0088cc] animate-bounce">
              <Send className="w-7 h-7 fill-[#0088cc]" />
            </div>

            {/* Right/Bottom Dotted Line */}
            <div className="flex items-center gap-1.5 text-[#0088cc]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0088cc]/60 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>

            <span className="text-xs sm:text-sm font-bold text-[#0088cc] tracking-tight mt-1">Instant Delivery</span>

            {/* Bottom Curved Arrow Path */}
            <svg className="w-24 h-8 text-[#0088cc]/40 hidden lg:block" viewBox="0 0 100 30" fill="none">
              <path d="M 10 5 C 40 35, 70 35, 90 10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
              <path d="M 85 5 L 92 10 L 86 16" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          {/* Right Window: Student's Telegram */}
          <div className="w-full lg:w-[420px] bg-[#0f172a] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden text-white">
            {/* Telegram Channel Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#1e293b] border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0088cc] to-[#38bdf8] flex items-center justify-center text-white shadow-md">
                  <Send className="w-5 h-5 fill-white ml-[-1px]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">GK Practice Channel</h4>
                  <p className="text-xs text-[#38bdf8] font-medium">1,234 subscribers</p>
                </div>
              </div>
              <div className="text-slate-400 font-bold text-lg cursor-pointer">•••</div>
            </div>

            {/* Telegram Message Box */}
            <div className="p-5 space-y-4 bg-[#0f172a]/95">
              {/* Quiz Card */}
              <div className="bg-[#1e293b]/90 border border-slate-700/60 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                  <span>📝</span>
                  <span>Quiz Time!</span>
                </div>
                <p className="text-slate-200 text-sm mb-4 leading-relaxed">What is the capital of India?</p>

                {/* MCQ Options */}
                <div className="space-y-2">
                  {/* Option A */}
                  <div className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 text-slate-300 text-xs font-medium border border-slate-700/40 cursor-pointer">
                    A. Mumbai
                  </div>

                  {/* Option B (Selected Answer) */}
                  <div className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-500 ${
                    showAnswer
                      ? "bg-[#059669]/30 text-[#34d399] border border-[#059669]/80 shadow-sm"
                      : "bg-slate-800/80 text-slate-300 border border-slate-700/40"
                  }`}>
                    <span>B. New Delhi</span>
                    {showAnswer && <Check className="w-4 h-4 text-[#34d399] stroke-[3]" />}
                  </div>

                  {/* Option C */}
                  <div className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 text-slate-300 text-xs font-medium border border-slate-700/40 cursor-pointer">
                    C. Kolkata
                  </div>

                  {/* Option D */}
                  <div className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 text-slate-300 text-xs font-medium border border-slate-700/40 cursor-pointer">
                    D. Chennai
                  </div>
                </div>

                {/* Time stamp */}
                <div className="flex items-center justify-end gap-1.5 mt-3 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Just now</span>
                </div>
              </div>

              {/* Response Stats Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#1e293b]/70 border border-slate-700/40 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#38bdf8]" />
                  <span>156 students answered</span>
                </div>
                <MessageCircle className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom 4 Feature Bar Cards from Screenshot */}
        <div className="bg-card/90 backdrop-blur-md rounded-3xl border border-border/60 shadow-lg p-6 sm:p-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
            {/* Feature 1 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pr-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 fill-purple-600 dark:fill-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Real-time Delivery</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Quizzes reach students instantly on Telegram.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">100% Automated</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">No manual work. Just schedule and relax.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Track Everything</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">See delivery, views, and responses in real-time.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:pl-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">More Engagement</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Reach more students and get better responses.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
