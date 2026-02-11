import { useState, useEffect } from "react";
import { Sparkles, XCircle, ArrowLeft, Eye, EyeOff, Zap, Users, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[150px] animate-blob delay-200" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative p-12 flex-col justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center shadow-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-display font-bold text-foreground">TelePost</span>
        </div>

        {/* Main Content */}
        <div className="max-w-lg">
          <h1 className="text-5xl font-display font-bold leading-tight mb-6">
            <span className="text-gradient-primary">Transform</span>
            <br />
            <span className="text-foreground">your teaching</span>
            <br />
            <span className="text-foreground">experience</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Join 500+ coaching institutes using AI-powered quizzes and automated Telegram delivery.
          </p>

          {/* Feature List */}
          <div className="mt-12 space-y-6">
            {[
              { icon: Zap, label: "AI-Generated Quizzes", desc: "Create quizzes in seconds" },
              { icon: Users, label: "Student Management", desc: "Track progress effortlessly" },
              { icon: BookOpen, label: "Smart Analytics", desc: "Data-driven insights" },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{feature.label}</div>
                  <div className="text-sm text-muted-foreground">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-muted-foreground">
          Trusted by 50,000+ students worldwide
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md relative z-10">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-8 text-muted-foreground hover:text-foreground -ml-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Button>

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">TelePost</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">
              {activeTab === "signin" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-muted-foreground">
              {activeTab === "signin"
                ? "Enter your credentials to access your dashboard"
                : "Create your account to get started"}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="glass-card p-1.5 mb-8">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setActiveTab("signin")}
                className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === "signin"
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-glow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab("signup")}
                className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === "signup"
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-glow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Sign In Form */}
          {activeTab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-foreground font-medium">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  onBlur={() => validateEmail(email)}
                  required
                  className={`h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${emailError ? "border-destructive" : ""
                    }`}
                />
                {emailError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {emailError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    required
                    className={`h-12 bg-white/5 border-white/10 rounded-xl pr-12 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${passwordError ? "border-destructive" : ""
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {passwordError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 btn-primary-gradient text-white font-semibold rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-300"
              >
                <span className="relative z-10">
                  {loading ? "Signing in..." : "Sign In"}
                </span>
              </Button>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-5 animate-fade-in">

              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-foreground font-medium">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-institute" className="text-foreground font-medium">
                  Institute Name
                </Label>
                <Input
                  id="signup-institute"
                  type="text"
                  placeholder="Royal Coaching Classes"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-foreground font-medium">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  onBlur={() => validateEmail(email)}
                  required
                  className={`h-12 bg-white/5 border-white/10 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${emailError ? "border-destructive" : ""
                    }`}
                />
                {emailError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {emailError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    onBlur={() => validatePassword(password, true)}
                    required
                    className={`h-12 bg-white/5 border-white/10 rounded-xl pr-12 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all ${passwordError ? "border-destructive" : ""
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-2">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className={`text-xs ${passwordStrength.strength === "Strong" ? "text-success" :
                      passwordStrength.strength === "Medium" ? "text-accent" : "text-destructive"
                      }`}>
                      {passwordStrength.strength} password
                    </p>
                  </div>
                )}
                {passwordError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {passwordError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 btn-primary-gradient text-white font-semibold rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-300"
              >
                <span className="relative z-10">
                  {loading ? "Creating account..." : "Create Account"}
                </span>
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
