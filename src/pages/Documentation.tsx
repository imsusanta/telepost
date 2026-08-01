import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
    Rocket, MessageSquare, Zap, ShieldCheck, Bot,
    Send, BookOpen, Calendar, FileText, Users,
    ChevronRight, AlertCircle, CheckCircle2, Copy
} from "lucide-react";

const Documentation = () => {
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
        <div className="min-h-screen bg-background text-foreground">
            <Navigation onGetStarted={handleGetStarted} />

            <main className="max-w-5xl mx-auto px-4 pt-32 pb-20">
                {/* Hero */}
                <header className="text-center mb-20">
                    <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 text-gradient-primary">
                        Getting Started with TelePost
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        A complete guide to setting up your account, connecting your Telegram bot and channels, and automating your content — step by step.
                    </p>
                </header>

                {/* Table of Contents */}
                <nav className="mb-20 p-8 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-sm">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-primary" />
                        Table of Contents
                    </h2>
                    <ul className="grid sm:grid-cols-2 gap-3">
                        {[
                            { label: "1. Create Your Account", href: "#create-account" },
                            { label: "2. Create a Telegram Bot", href: "#create-bot" },
                            { label: "3. Connect Your Bot to TelePost", href: "#connect-bot" },
                            { label: "4. Add Channels & Groups", href: "#add-channels" },
                            { label: "5. Generate Quizzes with AI", href: "#generate-quizzes" },
                            { label: "6. Schedule & Auto-Post", href: "#schedule-post" },
                            { label: "7. Manage Question Bank", href: "#question-bank" },
                            { label: "8. Security & Tips", href: "#security" },
                        ].map((item) => (
                            <li key={item.href}>
                                <a
                                    href={item.href}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200 group"
                                >
                                    <ChevronRight className="w-4 h-4 text-primary/50 group-hover:translate-x-1 transition-transform" />
                                    {item.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* ── Section 1: Create Account ──────────────────────────── */}
                <section id="create-account" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Rocket className="w-7 h-7 text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-bold">1. Create Your Account</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-blue-500/20">
                        <p>Visit the TelePost homepage and click <strong className="text-foreground">"Go to Dashboard"</strong> or <strong className="text-foreground">"Get Started"</strong>.</p>
                        <p>You can sign up using:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong className="text-foreground">Email & Password</strong> — Enter your email and create a secure password.</li>
                            <li><strong className="text-foreground">Google Account</strong> — One-click sign-in with your existing Google account.</li>
                        </ul>
                        <p>After signing up, you'll be redirected to your personal dashboard where you can manage everything.</p>
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 mt-4">
                            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-sm"><strong className="text-foreground">Tip:</strong> Make sure to verify your email if you sign up with email & password. Check your inbox (and spam folder) for the verification link.</p>
                        </div>
                    </div>
                </section>

                {/* ── Section 2: Create Telegram Bot ─────────────────────── */}
                <section id="create-bot" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                            <Bot className="w-7 h-7 text-cyan-500" />
                        </div>
                        <h2 className="text-3xl font-bold">2. Create a Telegram Bot</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-cyan-500/20">
                        <p>Before connecting to TelePost, you need a Telegram bot. Here's how to create one:</p>

                        <div className="space-y-6 mt-4">
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-bold text-sm shrink-0">1</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Open Telegram and search for @BotFather</p>
                                    <p>BotFather is the official Telegram bot for creating and managing bots. Open Telegram (mobile or desktop) and search for <strong className="text-foreground">@BotFather</strong> in the search bar, then start a conversation.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-bold text-sm shrink-0">2</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Send the /newbot command</p>
                                    <p>Type <code className="px-2 py-0.5 rounded bg-muted text-foreground text-sm">/newbot</code> and press send. BotFather will ask you to choose a name for your bot.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-bold text-sm shrink-0">3</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Choose a name and username</p>
                                    <p>Enter a <strong className="text-foreground">display name</strong> (e.g., "My Quiz Bot") and then a <strong className="text-foreground">username</strong> that must end with "bot" (e.g., <code className="px-2 py-0.5 rounded bg-muted text-foreground text-sm">myquiz_telepost_bot</code>).</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-bold text-sm shrink-0">4</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Copy your Bot Token</p>
                                    <p>BotFather will reply with a message containing your <strong className="text-foreground">HTTP API Token</strong>. It looks like this:</p>
                                    <div className="flex items-center gap-2 mt-2 p-3 rounded-xl bg-muted/50 border border-border/50 font-mono text-sm">
                                        <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <span className="text-foreground">7123456789:AAH-aBcDeFgHiJkLmNoPqRsTuVwXyZ</span>
                                    </div>
                                    <p className="mt-2 text-sm">Copy this token carefully — you'll need to paste it in TelePost.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 mt-4">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-sm"><strong className="text-foreground">Important:</strong> Never share your bot token publicly. Anyone with your token can control your bot. If your token is compromised, use <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">/revoke</code> in BotFather to generate a new one.</p>
                        </div>
                    </div>
                </section>

                {/* ── Section 3: Connect Bot to TelePost ─────────────────── */}
                <section id="connect-bot" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                            <MessageSquare className="w-7 h-7 text-green-500" />
                        </div>
                        <h2 className="text-3xl font-bold">3. Connect Your Bot to TelePost</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-green-500/20">
                        <p>Now paste your bot token into TelePost to link your Telegram bot:</p>

                        <div className="space-y-6 mt-4">
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-sm shrink-0">1</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Go to Dashboard → Settings</p>
                                    <p>Navigate to your <strong className="text-foreground">Dashboard</strong>, then click on <strong className="text-foreground">"Settings"</strong> in the sidebar.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-sm shrink-0">2</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Find the "Telegram Bot Token" field</p>
                                    <p>In the Settings page, look for the <strong className="text-foreground">Telegram Bot Token</strong> input field. Paste the token you copied from BotFather here.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-sm shrink-0">3</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Click "Save" or "Connect"</p>
                                    <p>TelePost will verify your token and connect your bot. You should see a <strong className="text-foreground">green success message</strong> once connected.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20 mt-4">
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                            <p className="text-sm"><strong className="text-foreground">Done!</strong> Your Telegram bot is now linked to TelePost. You can now add channels and start posting.</p>
                        </div>
                    </div>
                </section>

                {/* ── Section 4: Add Channels ────────────────────────────── */}
                <section id="add-channels" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Users className="w-7 h-7 text-purple-500" />
                        </div>
                        <h2 className="text-3xl font-bold">4. Add Channels & Groups</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-purple-500/20">
                        <p>After your bot is connected, you need to add your Telegram channels or groups:</p>

                        <div className="space-y-6 mt-4">
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm shrink-0">1</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Add your bot as an Admin to the channel/group</p>
                                    <p>Open your Telegram channel or group → Go to <strong className="text-foreground">Settings → Administrators → Add Admin</strong> → Search for your bot's username and add it. Make sure it has permission to <strong className="text-foreground">post messages</strong>.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm shrink-0">2</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Go to Dashboard → Channels</p>
                                    <p>In TelePost, navigate to the <strong className="text-foreground">"Channels"</strong> section from the sidebar. Click <strong className="text-foreground">"Add Channel"</strong>.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm shrink-0">3</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Enter the Channel ID or username</p>
                                    <p>Provide the <strong className="text-foreground">@username</strong> (e.g., <code className="px-2 py-0.5 rounded bg-muted text-foreground text-sm">@mychannel</code>) or the <strong className="text-foreground">numeric Chat ID</strong> of your channel. TelePost will verify and link it.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 mt-4">
                            <AlertCircle className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                            <p className="text-sm"><strong className="text-foreground">Note:</strong> For private channels, you'll need the numeric Chat ID. You can get this by forwarding a message from the channel to <strong className="text-foreground">@userinfobot</strong> on Telegram.</p>
                        </div>
                    </div>
                </section>

                {/* ── Section 5: Generate Quizzes ─────────────────────────── */}
                <section id="generate-quizzes" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Zap className="w-7 h-7 text-amber-500" />
                        </div>
                        <h2 className="text-3xl font-bold">5. Generate Quizzes with AI</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-amber-500/20">
                        <p>TelePost can automatically generate quiz questions from your content:</p>

                        <div className="space-y-6 mt-4">
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0">1</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Go to Dashboard → Create Quiz</p>
                                    <p>Click <strong className="text-foreground">"Create Quiz"</strong> from the sidebar or dashboard home.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0">2</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Provide content</p>
                                    <p>You can either <strong className="text-foreground">paste text</strong> directly, <strong className="text-foreground">upload a PDF</strong>, or select a topic. The AI will analyze the material and generate multiple-choice questions.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0">3</span>
                                <div>
                                     <p className="font-semibold text-foreground mb-1">Configure options</p>
                                    <p>Choose the <strong className="text-foreground">number of questions</strong>, <strong className="text-foreground">language</strong>, and <strong className="text-foreground">subject/topic</strong>. All quizzes automatically follow <strong className="text-foreground">Government Competitive Exam Standards</strong>.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm shrink-0">4</span>
                                <div>
                                    <p className="font-semibold text-foreground mb-1">Review and post</p>
                                    <p>Preview the generated questions, edit any as needed, select a channel, and click <strong className="text-foreground">"Send to Telegram"</strong> to post instantly.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Section 6: Schedule & Auto-Post ─────────────────────── */}
                <section id="schedule-post" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                            <Calendar className="w-7 h-7 text-rose-500" />
                        </div>
                        <h2 className="text-3xl font-bold">6. Schedule & Auto-Post</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-rose-500/20">
                        <p>Automate your posting schedule so quizzes go out on time, every time:</p>
                        <ul className="list-disc pl-6 space-y-3">
                            <li>Go to <strong className="text-foreground">Dashboard → Scheduler</strong>.</li>
                            <li>Set the <strong className="text-foreground">date and time</strong> for each quiz or post you want to send.</li>
                            <li>Choose which <strong className="text-foreground">channel</strong> to post to.</li>
                            <li>Enable <strong className="text-foreground">Auto-Scheduler</strong> to let TelePost automatically pick topics and generate quizzes on a recurring schedule (daily, weekly, etc.).</li>
                            <li>Each scheduled post will be sent at the specified time, even if you're offline.</li>
                        </ul>
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 mt-4">
                            <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                            <p className="text-sm"><strong className="text-foreground">Tip:</strong> Use the auto-scheduler with your Question Bank topics to keep your channel active with fresh quizzes automatically — no manual work needed!</p>
                        </div>
                    </div>
                </section>

                {/* ── Section 7: Question Bank ────────────────────────────── */}
                <section id="question-bank" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center shrink-0">
                            <FileText className="w-7 h-7 text-teal-500" />
                        </div>
                        <h2 className="text-3xl font-bold">7. Manage Question Bank</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-teal-500/20">
                        <p>The Question Bank is your library of all quiz questions:</p>
                        <ul className="list-disc pl-6 space-y-3">
                            <li><strong className="text-foreground">View all questions</strong> organized by subject and topic.</li>
                            <li><strong className="text-foreground">Add questions manually</strong> or import them from AI-generated quizzes.</li>
                            <li><strong className="text-foreground">Edit or delete</strong> any question at any time.</li>
                            <li><strong className="text-foreground">Filter & search</strong> by subject, topic, or keyword.</li>
                            <li><strong className="text-foreground">Reuse questions</strong> for future quizzes and scheduled posts.</li>
                        </ul>
                    </div>
                </section>

                {/* ── Section 8: Security ─────────────────────────────────── */}
                <section id="security" className="mb-20 scroll-mt-24">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-7 h-7 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-bold">8. Security & Tips</h2>
                    </div>
                    <div className="space-y-4 text-muted-foreground leading-relaxed pl-4 border-l-2 border-emerald-500/20">
                        <ul className="list-disc pl-6 space-y-3">
                            <li>TelePost uses <strong className="text-foreground">industry-standard encryption</strong> and official Telegram APIs.</li>
                            <li>We <strong className="text-foreground">never store your password</strong> — authentication is handled via secure providers (Google, Supabase Auth).</li>
                            <li>Your <strong className="text-foreground">bot token is encrypted</strong> and stored securely.</li>
                            <li>If you suspect your bot token is compromised, use <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm">/revoke</code> in BotFather and update it in TelePost Settings.</li>
                            <li>Always <strong className="text-foreground">log out</strong> when using a shared device.</li>
                        </ul>
                    </div>
                </section>

                {/* ── CTA ─────────────────────────────────────────────────── */}
                <div className="text-center py-16 px-8 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border border-primary/20">
                    <Send className="w-10 h-10 text-primary mx-auto mb-6" />
                    <h3 className="text-3xl font-bold mb-4">Ready to automate?</h3>
                    <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                        Start creating AI-powered quizzes and engaging your Telegram audience today.
                    </p>
                    <button
                        onClick={handleGetStarted}
                        className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
                    >
                        Go to Your Dashboard
                    </button>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Documentation;
