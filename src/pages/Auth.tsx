import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff, Zap, Users, ArrowRight, ShieldCheck, Mail, Lock, User, Building } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  validatePassword as validatePasswordSecurity,
  isValidEmail,
  sanitizeInput,
  checkRateLimit
} from "@/utils/security";

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

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string, isSignup: boolean = false): boolean => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }

    if (isSignup) {
      const validation = validatePasswordSecurity(password);
      if (!validation.isValid) {
        setPasswordError(validation.errors[0]);
        return false;
      }
    } else {
      if (password.length < 1) {
        setPasswordError("Password is required");
        return false;
      }
    }

    setPasswordError("");
    return true;
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (password.length === 0) return { strength: "", color: "", width: "0%" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[@$!%*?&#])/.test(password)) score++;

    if (score <= 2) return { strength: "Weak", color: "bg-destructive", width: "33%" };
    if (score <= 4) return { strength: "Medium", color: "bg-accent", width: "66%" };
    return { strength: "Strong", color: "bg-success", width: "100%" };
  };

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    }).catch((error) => {
      console.error("Failed to get session:", error);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password, true);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    const sanitizedFullName = sanitizeInput(fullName.trim());
    if (!sanitizedFullName) {
      toast({
        title: "Error",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    const rateLimit = checkRateLimit('signup', 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${resetMinutes} minutes before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: sanitizedFullName,
            institute_name: sanitizeInput(instituteName.trim()),
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Account created successfully! You can now sign in.",
      });
      localStorage.removeItem('ratelimit_signup');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create account";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEmailValid = validateEmail(email);
    if (!isEmailValid || !password) {
      if (!password) {
        setPasswordError("Password is required");
      }
      return;
    }

    const rateLimit = checkRateLimit('login', 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      toast({
        title: "Too Many Login Attempts",
        description: `Account temporarily locked. Please wait ${resetMinutes} minutes before trying again.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        throw error;
      }

      localStorage.removeItem('ratelimit_login');

      if (data.session) {
        await new Promise(resolve => setTimeout(resolve, 200));
        await supabase.auth.getSession();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to sign in";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100 }
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      {/* Dynamic Background */}
      <div className="mesh-gradient opacity-40" />
      <div className="absolute inset-0 grid-pattern opacity-10 pointer-events-none" />

      {/* Hero Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-soft-float" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] animate-soft-float delay-1000" />

      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden lg:flex lg:w-1/2 relative p-16 flex-col justify-between z-10"
      >
        {/* Logo Section */}
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl group-hover:scale-110 transition-transform duration-500 bg-white p-2">
            <img src="/icon.png" alt="TelePost Icon" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-3xl font-display font-black tracking-tight text-foreground">TelePost</span>
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#0088cc] opacity-90">Next Gen Automation</div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-xl">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            <motion.h1 variants={itemVariants} className="text-6xl font-display font-extrabold leading-[1.1] text-foreground tracking-tight">
              <span className="text-gradient-primary">Elevate</span> your
              <br />
              Digital <span className="inline-flex items-center gap-3">Classroom <ArrowRight className="text-primary w-12 h-12 p-2 bg-primary/10 rounded-full" /></span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-muted-foreground/80 leading-relaxed font-medium max-w-lg">
              Empower your institute with AI-driven content generation and seamless Telegram delivery patterns.
            </motion.p>

            {/* Feature Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 pt-6">
              {[
                { icon: Zap, label: "Instant AI Quizzes", desc: "Generate expert-level assessments in seconds.", color: "text-[#0088cc]", bg: "bg-[#0088cc]/10" },
                { icon: ShieldCheck, label: "Secure Delivery", desc: "Automated distribution with enterprise security.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { icon: Users, label: "Unified Panel", desc: "Manage channels, students, and courses in one place.", color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map((feature, idx) => (
                <div key={idx} className="glass group hover:bg-white/10 p-5 rounded-2xl flex items-center gap-6 transition-all duration-300 cursor-default border border-white/5 hover:border-white/10 shadow-sm hover:shadow-md">
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${feature.color}`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground mb-0.5">{feature.label}</h3>
                    <p className="text-sm text-muted-foreground/80 leading-snug">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-8 text-sm font-semibold">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                <img src={`https://i.pravatar.cc/150?u=${i + 10}`} alt="user" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[10px] text-white">
              +5k
            </div>
          </div>
          <span className="text-muted-foreground">Trusted by educators globally</span>
        </div>
      </motion.div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-2 mb-10 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            <div className="w-8 h-8 rounded-lg glass flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to portal
          </button>

          {/* Form Card */}
          <div className="clay-card p-0.5 relative overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
            <div className="bg-card/30 backdrop-blur-3xl p-10 rounded-[inherit] border border-white/10">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-4xl font-display font-black text-foreground mb-3 leading-none">
                  {activeTab === "signin" ? "Welcome Back" : "Start Journey"}
                </h2>
                <p className="text-muted-foreground font-medium">
                  {activeTab === "signin"
                    ? "Log in to your command center"
                    : "Create your workspace in seconds"}
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="relative glass p-1 rounded-xl mb-8 flex items-center">
                <motion.div
                  className="absolute h-[calc(100%-8px)] rounded-lg bg-gradient-to-r from-primary to-accent shadow-glow-sm"
                  initial={false}
                  animate={{
                    left: activeTab === "signin" ? "4px" : "50%",
                    width: "calc(50% - 4px)"
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button
                  onClick={() => setActiveTab("signin")}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors duration-300 ${activeTab === "signin" ? "text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors duration-300 ${activeTab === "signup" ? "text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === 'signin' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === 'signin' ? 20 : -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {activeTab === "signin" ? (
                    <form onSubmit={handleSignIn} className="space-y-6">
                      <div className="space-y-2 group">
                        <Label htmlFor="signin-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="name@institute.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                            onBlur={() => validateEmail(email)}
                            required
                            className={`pl-11 h-13 input-premium rounded-2xl transition-all duration-300 focus:shadow-[0_0_20px_rgba(0,136,204,0.15)] ${emailError ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                          />
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#0088cc] group-focus-within:scale-110 transition-all duration-300" />
                        </div>
                        {emailError && <p className="text-[10px] font-bold text-destructive px-1 uppercase tracking-wider">{emailError}</p>}
                      </div>

                      <div className="space-y-2 group">
                        <div className="flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wider">
                          <Label htmlFor="signin-password" className="text-muted-foreground">Password</Label>
                          <button type="button" className="text-primary hover:underline transition-all">Forgot?</button>
                        </div>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                            required
                            className={`pl-11 pr-12 h-13 input-premium rounded-2xl transition-all duration-300 focus:shadow-[0_0_20px_rgba(0,136,204,0.15)] ${passwordError ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
                          />
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#0088cc] group-focus-within:scale-110 transition-all duration-300" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {passwordError && <p className="text-[10px] font-bold text-destructive px-1 uppercase tracking-wider">{passwordError}</p>}
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 btn-primary-gradient text-white font-black uppercase tracking-widest rounded-2xl shadow-glow hover:scale-[1.02] transition-all"
                      >
                        {loading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</span> : "Access Dashboard"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Your Name</Label>
                          <div className="relative">
                            <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-10 h-12 input-premium rounded-xl" />
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Institute</Label>
                          <div className="relative">
                            <Input placeholder="Company" value={instituteName} onChange={(e) => setInstituteName(e.target.value)} required className="pl-10 h-12 input-premium rounded-xl" />
                            <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Work Email</Label>
                        <div className="relative">
                          <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }} onBlur={() => validateEmail(email)} required className="pl-10 h-12 input-premium rounded-xl" />
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Set Password</Label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                            onBlur={() => validatePassword(password, true)}
                            required
                            className="pl-10 pr-12 h-12 input-premium rounded-xl"
                          />
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {password && (
                          <div className="px-1 space-y-1.5">
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: passwordStrength.width }} className={`h-full ${passwordStrength.color} transition-all duration-300`} />
                            </div>
                            <p className="text-[10px] uppercase font-black tracking-widest opacity-80">{passwordStrength.strength} Security</p>
                          </div>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 btn-primary-gradient text-white font-black uppercase tracking-widest rounded-2xl shadow-glow mt-2 hover:scale-[1.02] transition-all"
                      >
                        {loading ? "Initializing..." : "Create Account"}
                      </Button>

                      <p className="text-center text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                        Securely processed by <span className="text-foreground">TelePost Auth Engine</span>
                      </p>
                      
                      <div className="pt-4 mt-4 border-t border-white/5 flex justify-center">
                        <button 
                          type="button"
                          onClick={() => navigate("/super-admin/login")}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#0088cc] hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Super Admin Portal
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`
        .h-13 { height: 3.25rem; }
        .font-black { font-weight: 900; }
        .input-premium:focus-visible {
          ring: 0;
          outline: none;
        }
      `}</style>
    </div>
  );
}
