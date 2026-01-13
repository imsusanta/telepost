import { useInView } from "@/hooks/useInView";
import { Send, Check, Users, Clock, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

export const TelegramDemo = () => {
    const { ref, isInView } = useInView({ threshold: 0.3 });
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

        timers.push(setTimeout(() => setStep(1), 500));
        timers.push(setTimeout(() => setStep(2), 1500));
        timers.push(setTimeout(() => setStep(3), 2500));
        timers.push(setTimeout(() => setShowAnswer(true), 3500));
        timers.push(setTimeout(() => setStep(4), 4500));

        return () => timers.forEach(clearTimeout);
    }, [isInView]);

    return (
        <section
            ref={ref as React.RefObject<HTMLElement>}
            className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        >
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.05),_transparent_70%)]" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header */}
                <div className={`text-center mb-16 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    }`}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#0088cc]/30 bg-[#0088cc]/5 text-sm text-[#0088cc] mb-6">
                        <Send className="w-4 h-4" />
                        <span>Live Preview</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
                        Watch It <span className="text-gradient-primary">In Action</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                        See how your quiz reaches students in real-time on Telegram
                    </p>
                </div>

                {/* Phone mockups */}
                <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">

                    {/* Dashboard side */}
                    <div className={`transition-all duration-1000 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"
                        }`}>
                        <div className="text-center mb-4">
                            <span className="text-sm font-medium text-muted-foreground">Your Dashboard</span>
                        </div>
                        <div className="w-72 sm:w-80 bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden">
                            {/* Browser bar */}
                            <div className="flex items-center gap-1.5 px-4 py-3 bg-muted/50 border-b border-border/50">
                                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                                <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                {/* Quiz ready */}
                                <div className={`p-3 rounded-xl bg-[#0088cc]/5 border border-[#0088cc]/20 transition-all duration-500 ${step >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-95"
                                    }`}>
                                    <p className="text-sm font-medium text-foreground mb-2">📝 Quiz Ready</p>
                                    <p className="text-xs text-muted-foreground">What is the capital of India?</p>
                                </div>

                                {/* Channel selected */}
                                <div className={`p-3 rounded-xl bg-muted/50 border border-border/50 transition-all duration-500 ${step >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-95"
                                    }`}>
                                    <p className="text-sm font-medium text-foreground mb-2">📢 Channel Selected</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[#0088cc] flex items-center justify-center">
                                            <Send className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-xs text-muted-foreground">GK Practice Channel</span>
                                    </div>
                                </div>

                                {/* Post button */}
                                <div className={`transition-all duration-500 ${step >= 3 ? "opacity-100 scale-100" : "opacity-0 scale-95"
                                    }`}>
                                    <button className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#0077b5] text-white font-medium flex items-center justify-center gap-2">
                                        <Send className="w-4 h-4" />
                                        Post to Telegram
                                        {step >= 3 && <Check className="w-4 h-4 animate-bounce" />}
                                    </button>
                                </div>

                                {/* Success message */}
                                <div className={`p-3 rounded-xl bg-success/10 border border-success/20 transition-all duration-500 ${step >= 4 ? "opacity-100 scale-100" : "opacity-0 scale-95"
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-success" />
                                        <p className="text-sm font-medium text-success">Posted Successfully!</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">1,234 students reached</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className={`hidden lg:flex flex-col items-center gap-2 transition-all duration-700 ${step >= 3 ? "opacity-100" : "opacity-0"
                        }`}>
                        <div className="text-[#0088cc] font-medium text-sm">Instant Delivery</div>
                        <div className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-3 h-3 rounded-full bg-[#0088cc] animate-pulse"
                                    style={{ animationDelay: `${i * 200}ms` }}
                                />
                            ))}
                            <Send className="w-6 h-6 text-[#0088cc] ml-2" />
                        </div>
                    </div>

                    {/* Telegram phone */}
                    <div className={`transition-all duration-1000 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"
                        }`}
                        style={{ transitionDelay: "300ms" }}
                    >
                        <div className="text-center mb-4">
                            <span className="text-sm font-medium text-muted-foreground">Student's Telegram</span>
                        </div>
                        <div className="w-72 sm:w-80 bg-[#0e1621] rounded-3xl border border-[#0088cc]/30 shadow-2xl overflow-hidden">
                            {/* Telegram header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#17212b] border-b border-[#0088cc]/20">
                                <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center">
                                    <Send className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">GK Practice Channel</p>
                                    <p className="text-xs text-[#0088cc]">1,234 subscribers</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="p-4 space-y-4 min-h-[280px]">
                                {/* Quiz message */}
                                <div className={`transition-all duration-500 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                                    }`}>
                                    <div className="bg-[#182533] rounded-xl p-3">
                                        <p className="text-white text-sm mb-3">📝 <strong>Quiz Time!</strong></p>
                                        <p className="text-white/90 text-sm mb-4">What is the capital of India?</p>

                                        {/* Options */}
                                        <div className="space-y-2">
                                            {["Mumbai", "New Delhi", "Kolkata", "Chennai"].map((option, i) => (
                                                <button
                                                    key={i}
                                                    className={`w-full py-2 px-3 rounded-lg text-left text-sm transition-all ${showAnswer && i === 1
                                                            ? "bg-success/20 text-success border border-success/30"
                                                            : "bg-[#0088cc]/10 text-white/80 hover:bg-[#0088cc]/20"
                                                        }`}
                                                >
                                                    {String.fromCharCode(65 + i)}. {option}
                                                    {showAnswer && i === 1 && <Check className="inline w-4 h-4 ml-2" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Time stamp */}
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <Clock className="w-3 h-3 text-[#0088cc]/50" />
                                        <span className="text-xs text-[#0088cc]/50">Just now</span>
                                    </div>
                                </div>

                                {/* Responses */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#182533] transition-all duration-500 ${step >= 4 ? "opacity-100 scale-100" : "opacity-0 scale-95"
                                    }`}>
                                    <Users className="w-4 h-4 text-[#0088cc]" />
                                    <span className="text-xs text-white/70">156 students answered</span>
                                    <MessageCircle className="w-4 h-4 text-[#0088cc] ml-auto" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timer */}
                <div className={`mt-12 text-center transition-all duration-700 ${step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                    }`}>
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-success/10 border border-success/30">
                        <Check className="w-5 h-5 text-success" />
                        <span className="text-success font-medium">Done in just 30 seconds!</span>
                    </div>
                </div>
            </div>
        </section>
    );
};
