import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Building, ShieldCheck, ArrowRight, Zap, Users, BarChart3, CheckCircle2, BookOpen, Send, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { validatePassword as validatePasswordSecurity, isValidEmail, sanitizeInput, checkRateLimit } from "@/utils/security";
import "./Auth.css";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [typedText, setTypedText] = useState("");
  const fullWord = "automated.";

  useEffect(() => {
    const startDelay = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setTypedText(fullWord.slice(0, i));
        if (i >= fullWord.length) clearInterval(interval);
      }, 90);
      return () => clearInterval(interval);
    }, 800);
    return () => clearTimeout(startDelay);
  }, []);

  const valEmail = (v: string) => {
    if (!v) { setEmailError("Email is required"); return false; }
    if (!isValidEmail(v)) { setEmailError("Invalid email address"); return false; }
    setEmailError(""); return true;
  };

  const valPw = (v: string, signup = false) => {
    if (!v) { setPasswordError("Password is required"); return false; }
    if (signup) {
      const r = validatePasswordSecurity(v);
      if (!r.isValid) { setPasswordError(r.errors[0]); return false; }
    }
    setPasswordError(""); return true;
  };

  const pwStr = (v: string) => {
    if (!v) return { s: "", w: "0%", c: "" };
    let sc = 0;
    if (v.length >= 8) sc++;
    if (v.length >= 12) sc++;
    if (/[a-z]/.test(v)) sc++;
    if (/[A-Z]/.test(v)) sc++;
    if (/\d/.test(v)) sc++;
    if (/[@$!%*?&#]/.test(v)) sc++;
    if (sc <= 2) return { s: "Weak", w: "33%", c: "#ef4444" };
    if (sc <= 4) return { s: "Medium", w: "66%", c: "#f59e0b" };
    return { s: "Strong", w: "100%", c: "#22c55e" };
  };
  const ps = pwStr(password);

  // Support ?next=/... redirect (e.g. OAuth consent flow) — only same-origin relative paths.
  const nextParam = (() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("next");
      return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
    } catch { return null; }
  })();
  const postAuthTarget = nextParam ?? "/dashboard";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(postAuthTarget);
    }).catch(console.error);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate(postAuthTarget);
    });
    return () => subscription.unsubscribe();
  }, [navigate, postAuthTarget]);


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valEmail(email) || !valPw(password, true)) return;
    const name = sanitizeInput(fullName.trim());
    if (!name) {
      toast({ title: "Error", description: "Enter your full name", variant: "destructive" });
      return;
    }
    const rl = checkRateLimit('signup', 10, 3600000);
    if (!rl.allowed) {
      toast({ title: "Too Many Attempts", description: `Wait ${Math.ceil((rl.resetTime - Date.now()) / 60000)} min`, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${postAuthTarget}`,
          data: { full_name: name, institute_name: sanitizeInput(instituteName.trim()) }
        }
      });
      if (error) throw error;
      toast({ title: "Success!", description: "Account created! You can now sign in." });
      localStorage.removeItem('ratelimit_signup');
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valEmail(email)) return;
    if (!password) { setPasswordError("Password is required"); return; }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(), password
      });
      if (error) throw error;
      localStorage.removeItem('ratelimit_login');
      if (data.session) {
        navigate(postAuthTarget);
      }
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Failed to sign in";
      if (msg.toLowerCase().includes("failed to fetch")) {
        msg = "Network connection failed. If you have Brave Shields or an adblocker active, please disable it for telepost.tech and refresh.";
      } else if (msg.toLowerCase().includes("invalid login credentials") || msg.toLowerCase().includes("invalid_credentials")) {
        msg = "Incorrect email or password. Please verify your email spelling or use 'Forgot password?' below.";
      }
      toast({ title: "Sign In Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!valEmail(email)) {
      toast({
        title: "Email Required",
        description: "Please enter your valid registered email address in the box above.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: `${window.location.origin}/auth?mode=reset`
      });
      if (error) throw error;
      toast({
        title: "Reset Link Sent",
        description: `We have sent a password reset link to ${email}. Check your inbox or spam folder.`
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send password reset email";
      toast({ title: "Reset Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stagger = (i: number) => ({
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: {
      opacity: 1, y: 0, scale: 1,
      transition: { delay: i * 0.08 + 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  });

  return (
    <div className="auth-root">
      {/* ── LEFT PANEL ── */}
      <motion.div
        className="auth-left"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-mesh" />
        <div className="auth-grid" />
        <div className="auth-particles">
          {[...Array(8)].map((_, i) => <div key={i} className="auth-particle" />)}
        </div>
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        {/* Floating stat cards */}
        <motion.div className="auth-float-card auth-float-card-1"
          initial={{ opacity: 0, scale: 0.7, y: 40, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.9, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
          whileHover={{ scale: 1.06, rotate: -1 }}
        >
          <div className="auth-float-icon" style={{ background: "rgba(74,222,128,0.2)" }}>
            <Zap size={18} color="#4ade80" />
          </div>
          <div>
            <div className="auth-float-label">AI quizzes</div>
            <div className="auth-float-value">from a topic or PDF</div>
          </div>
        </motion.div>

        <motion.div className="auth-float-card auth-float-card-2"
          initial={{ opacity: 0, scale: 0.7, y: 40, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          transition={{ delay: 1.2, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
          whileHover={{ scale: 1.06, rotate: 1 }}
        >
          <div className="auth-float-icon" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Users size={18} color="#fff" />
          </div>
          <div>
            <div className="auth-float-label">Telegram posting</div>
            <div className="auth-float-value">with your own bot</div>
          </div>
        </motion.div>

        <motion.div className="auth-float-card auth-float-card-3"
          initial={{ opacity: 0, scale: 0.7, y: 40, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          transition={{ delay: 1.5, duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
          whileHover={{ scale: 1.06, rotate: -1 }}
        >
          <div className="auth-float-icon" style={{ background: "rgba(251,191,36,0.2)" }}>
            <BarChart3 size={18} color="#fbbf24" />
          </div>
          <div>
            <div className="auth-float-label">7-day trial</div>
            <div className="auth-float-value">invitation code required</div>
          </div>
        </motion.div>

        {/* Brand */}
        <div className="auth-left-content">
          <motion.div className="auth-brand" onClick={() => navigate("/")}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <img src="/icon.png" alt="TelePost" className="auth-brand-icon" />
            <div>
              <div className="auth-brand-name">TelePost</div>
              <div className="auth-brand-tag">Smart Telegram Suite</div>
            </div>
          </motion.div>
        </div>

        {/* Hero */}
        <div className="auth-hero-section">
          <motion.h1 className="auth-hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Your teaching,<br />
            <span>{typedText}</span>
          </motion.h1>

          <motion.p className="auth-hero-sub"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            Create AI quizzes, schedule broadcasts, and manage your Telegram channels — all from one dashboard.
          </motion.p>

          <motion.div className="auth-features"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="auth-pill"><BookOpen size={13} /> AI Quiz Gen</div>
            <div className="auth-pill"><Send size={13} /> Auto Schedule</div>
            <div className="auth-pill"><Timer size={13} /> Question Bank</div>
            <div className="auth-pill"><CheckCircle2 size={13} /> Multi-Channel</div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div className="auth-stats"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div>
            <div className="auth-stat-num">7-day</div>
            <div className="auth-stat-label">Free trial</div>
          </div>
          <div>
            <div className="auth-stat-num">Invite</div>
            <div className="auth-stat-label">Only access</div>
          </div>
          <div>
            <div className="auth-stat-num">
              <span className="auth-pulse-dot" />Live
            </div>
            <div className="auth-stat-label">telepost.tech</div>
          </div>
        </motion.div>
      </motion.div>

      {/* ── RIGHT PANEL ── */}
      <div className="auth-right">
        <motion.div className="auth-form-wrap"
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <button onClick={() => navigate("/")} className="auth-back-btn">
            <ArrowLeft size={14} /> Back to home
          </button>

          <AnimatePresence mode="wait">
            <motion.div key={`hdr-${activeTab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="auth-hdr-title">
                {activeTab === "signin" ? "Welcome back" : "Get started free"}
              </h2>
              <p className="auth-hdr-desc">
                {activeTab === "signin"
                  ? "Enter your credentials to access your dashboard"
                  : "Create your account — no credit card needed"}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="auth-tabs-bar">
            {(["signin", "signup"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`auth-tab-btn ${activeTab === t ? "active" : ""}`}
              >
                {t === "signin" ? "Sign In" : "Sign Up"}
                {activeTab === t && (
                  <motion.div className="auth-tab-line" layoutId="tab-indicator"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === "signin" ? (
                <form onSubmit={handleSignIn} className="auth-form-fields">
                  <motion.div className="auth-fld" variants={stagger(0)} initial="hidden" animate="visible">
                    <label className="auth-fld-label">Email</label>
                    <div className="auth-inp-wrap">
                      <Mail className="auth-inp-icon" />
                      <input type="email" placeholder="you@example.com"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                        onBlur={() => valEmail(email)}
                        className={`auth-inp ${emailError ? "has-error" : ""}`}
                      />
                    </div>
                    {emailError && <motion.p className="auth-err" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}>{emailError}</motion.p>}
                  </motion.div>

                  <motion.div className="auth-fld" variants={stagger(1)} initial="hidden" animate="visible">
                    <div className="auth-fld-label-row">
                      <label className="auth-fld-label">Password</label>
                      <button type="button" onClick={handleForgotPassword} className="auth-fld-forgot">Forgot password?</button>
                    </div>
                    <div className="auth-inp-wrap">
                      <Lock className="auth-inp-icon" />
                      <input type={showPassword ? "text" : "password"}
                        placeholder="••••••••" value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
                        className={`auth-inp auth-inp-pw ${passwordError ? "has-error" : ""}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-eye">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordError && <motion.p className="auth-err" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}>{passwordError}</motion.p>}
                  </motion.div>

                  <motion.div variants={stagger(2)} initial="hidden" animate="visible">
                    <button type="submit" disabled={loading} className="auth-submit-btn">
                      <span className="auth-btn-inner">
                        {loading
                          ? <><span className="auth-spin" /> Signing in...</>
                          : <>Sign in to Dashboard <ArrowRight size={16} /></>
                        }
                      </span>
                    </button>
                  </motion.div>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="auth-form-fields">
                  <motion.div className="auth-2col" variants={stagger(0)} initial="hidden" animate="visible">
                    <div className="auth-fld">
                      <label className="auth-fld-label">Full Name</label>
                      <div className="auth-inp-wrap">
                        <User className="auth-inp-icon" />
                        <input placeholder="Your name" value={fullName}
                          onChange={e => setFullName(e.target.value)} required className="auth-inp" />
                      </div>
                    </div>
                    <div className="auth-fld">
                      <label className="auth-fld-label">Institute</label>
                      <div className="auth-inp-wrap">
                        <Building className="auth-inp-icon" />
                        <input placeholder="Institute name" value={instituteName}
                          onChange={e => setInstituteName(e.target.value)} required className="auth-inp" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div className="auth-fld" variants={stagger(1)} initial="hidden" animate="visible">
                    <label className="auth-fld-label">Work Email</label>
                    <div className="auth-inp-wrap">
                      <Mail className="auth-inp-icon" />
                      <input type="email" placeholder="you@example.com" value={email}
                        onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                        onBlur={() => valEmail(email)} required
                        className={`auth-inp ${emailError ? "has-error" : ""}`} />
                    </div>
                    {emailError && <motion.p className="auth-err" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}>{emailError}</motion.p>}
                  </motion.div>

                  <motion.div className="auth-fld" variants={stagger(2)} initial="hidden" animate="visible">
                    <label className="auth-fld-label">Password</label>
                    <div className="auth-inp-wrap">
                      <Lock className="auth-inp-icon" />
                      <input type={showPassword ? "text" : "password"}
                        placeholder="Min 8 characters" value={password}
                        onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
                        onBlur={() => valPw(password, true)} required
                        className={`auth-inp auth-inp-pw ${passwordError ? "has-error" : ""}`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-eye">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordError && <motion.p className="auth-err" initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}>{passwordError}</motion.p>}
                    {password && (
                      <motion.div className="auth-str" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                        <div className="auth-str-track">
                          <motion.div className="auth-str-fill"
                            animate={{ width: ps.w, backgroundColor: ps.c }}
                            transition={{ duration: 0.35 }}
                          />
                        </div>
                        <span className="auth-str-text" style={{ color: ps.c }}>{ps.s}</span>
                      </motion.div>
                    )}
                  </motion.div>

                  <motion.div variants={stagger(3)} initial="hidden" animate="visible">
                    <button type="submit" disabled={loading} className="auth-submit-btn">
                      <span className="auth-btn-inner">
                        {loading
                          ? <><span className="auth-spin" /> Creating...</>
                          : <>Create Account <ArrowRight size={16} /></>
                        }
                      </span>
                    </button>
                  </motion.div>

                  <motion.p className="auth-form-footer" variants={stagger(4)} initial="hidden" animate="visible">
                    By signing up, you agree to our <a href="/terms">Terms</a> & <a href="/privacy">Privacy Policy</a>
                  </motion.p>

                  <motion.div className="auth-admin-divider" variants={stagger(5)} initial="hidden" animate="visible">
                    <button type="button" onClick={() => navigate("/super-admin/login")} className="auth-admin-btn">
                      <ShieldCheck size={14} /> Super Admin Portal
                    </button>
                  </motion.div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
