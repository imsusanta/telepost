import { useState, useEffect } from "react";
import { CheckCircle2, Shield, Sparkles, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [invitationCode, setInvitationCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [invitationError, setInvitationError] = useState("");

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
      // For signin, just check it's not empty
      if (password.length < 1) {
        setPasswordError("Password is required");
        return false;
      }
    }

    setPasswordError("");
    return true;
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: "", color: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[@$!%*?&#])/.test(password)) score++;

    if (score <= 2) return { strength: "Weak", color: "text-destructive" };
    if (score <= 4) return { strength: "Medium", color: "text-yellow-600" };
    return { strength: "Strong", color: "text-green-600" };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateInvitationCode = async (code: string): Promise<boolean> => {
    // Invitation code is REQUIRED
    if (!code || code.trim().length === 0) {
      setInvitationError("Invitation code is required");
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('validate_invitation_code', {
        p_code: code.trim().toUpperCase()
      });

      if (error) {
        setInvitationError("Failed to validate invitation code");
        return false;
      }

      if (!data || data.length === 0 || !data[0].is_valid) {
        const message = data && data[0] ? data[0].message : "Invalid invitation code";
        setInvitationError(message);
        return false;
      }

      setInvitationError("");
      return true;
    } catch (error) {
      setInvitationError("Failed to validate invitation code");
      return false;
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    }).catch((error) => {
      console.error("Failed to get session:", error);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting for signup
    const rateLimit = checkRateLimit('signup', 3, 60 * 60 * 1000); // 3 attempts per hour
    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${resetMinutes} minutes before trying again.`,
        variant: "destructive",
      });
      return;
    }

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

    // Validate invitation code
    const isInvitationValid = await validateInvitationCode(invitationCode);
    if (!isInvitationValid) {
      return;
    }

    setLoading(true);

    try {
      const hasInvitationCode = invitationCode && invitationCode.trim().length > 0;

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: sanitizedFullName,
            invitation_code_used: hasInvitationCode ? invitationCode.trim().toUpperCase() : null,
          },
        },
      });

      if (error) throw error;

      // Consume the invitation code after successful signup (only if code was provided)
      if (data.user && hasInvitationCode) {
        try {
          await supabase.rpc('consume_invitation_code', {
            p_code: invitationCode.trim().toUpperCase(),
            p_user_id: data.user.id
          });

          // Update user profile with invitation code
          await supabase
            .from('profiles')
            .update({ invitation_code_used: invitationCode.trim().toUpperCase() })
            .eq('id', data.user.id);
        } catch (consumeError) {
          console.error('Error consuming invitation code:', consumeError);
          // Don't fail signup if consuming code fails, as user is already created
        }
      }

      toast({
        title: "Success!",
        description: "Account created successfully! You can now sign in.",
      });
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

    // Rate limiting for login attempts (5 attempts per 15 minutes)
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

    const isEmailValid = validateEmail(email);
    if (!isEmailValid || !password) {
      if (!password) {
        setPasswordError("Password is required");
      }
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

      // Clear rate limit on successful login
      localStorage.removeItem('ratelimit_login');

      // Ensure session is fully established before navigation
      if (data.session) {
        // Small delay to ensure session is persisted to storage and available in client
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify session is actually available in the client
        await supabase.auth.getSession();
        // Navigation will be handled by the auth state change listener
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
    // Don't set loading to false here - let the navigation handle it
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-clay animate-float">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-gradient bg-gradient-to-r from-primary to-accent">
              QuizGenie
            </span>
          </div>
          <p className="text-muted-foreground text-lg">AI-Powered Quiz Generation for Telegram</p>
        </div>

        <Card className="clay-card bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-foreground">Welcome</CardTitle>
            <CardDescription className="text-muted-foreground">Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 clay-card bg-muted/50 p-1.5 h-auto">
                <TabsTrigger value="signin" className="rounded-2xl py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-clay transition-all font-semibold">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-2xl py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-clay transition-all font-semibold">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="signin-email" className="text-foreground font-semibold">Email</Label>
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
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? "signin-email-error" : undefined}
                      className={`clay-input bg-input/50 border-border rounded-2xl py-6 ${emailError ? "border-destructive" : ""}`}
                    />
                    {emailError && (
                      <p id="signin-email-error" className="text-sm text-destructive flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {emailError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="signin-password" className="text-foreground font-semibold">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError("");
                      }}
                      required
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? "signin-password-error" : undefined}
                      className={`clay-input bg-input/50 border-border rounded-2xl py-6 ${passwordError ? "border-destructive" : ""}`}
                    />
                    {passwordError && (
                      <p id="signin-password-error" className="text-sm text-destructive flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {passwordError}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full clay-button bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-2xl py-6 font-semibold" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2.5">
                    <Label htmlFor="signup-invitation" className="text-foreground font-semibold flex items-center gap-2">
                      Invitation Code <span className="text-destructive">*</span>
                      <Shield className="w-4 h-4 text-primary" />
                    </Label>
                    <Input
                      id="signup-invitation"
                      type="text"
                      placeholder="Enter your invitation code"
                      value={invitationCode}
                      onChange={(e) => {
                        setInvitationCode(e.target.value.toUpperCase());
                        setInvitationError("");
                      }}
                      required
                      aria-invalid={!!invitationError}
                      aria-describedby={invitationError ? "signup-invitation-error" : undefined}
                      className={`clay-input bg-input/50 border-border rounded-2xl py-6 ${invitationError ? "border-destructive" : ""}`}
                    />
                    {invitationError && (
                      <p id="signup-invitation-error" className="text-sm text-destructive flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {invitationError}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This is an invitation-only platform. Contact an admin for access.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="signup-name" className="text-foreground font-semibold">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="clay-input bg-input/50 border-border rounded-2xl py-6"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="signup-email" className="text-foreground font-semibold">Email</Label>
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
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? "signup-email-error" : undefined}
                      className={`clay-input bg-input/50 border-border rounded-2xl py-6 ${emailError ? "border-destructive" : ""}`}
                    />
                    {emailError && (
                      <p id="signup-email-error" className="text-sm text-destructive flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {emailError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    <Label htmlFor="signup-password" className="text-foreground font-semibold">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError("");
                      }}
                      onBlur={() => validatePassword(password, true)}
                      required
                      minLength={8}
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? "signup-password-error" : "signup-password-strength"}
                      className={`clay-input bg-input/50 border-border rounded-2xl py-6 ${passwordError ? "border-destructive" : ""}`}
                    />
                    {passwordError && (
                      <p id="signup-password-error" className="text-sm text-destructive flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        {passwordError}
                      </p>
                    )}
                    {!passwordError && password && (
                      <p id="signup-password-strength" className={`text-sm flex items-center gap-1 ${passwordStrength.color}`}>
                        <CheckCircle2 className="w-4 h-4" />
                        Password strength: {passwordStrength.strength}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      <span>Must be 8+ characters with uppercase, lowercase, numbers, and special characters</span>
                    </div>
                  </div>
                  <Button type="submit" className="w-full clay-button bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-2xl py-6 font-semibold" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground clay-card-hover rounded-2xl px-6 py-3"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
