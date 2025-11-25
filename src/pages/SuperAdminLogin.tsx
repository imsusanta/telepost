import { useState, useEffect } from "react";
import { Shield, XCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { isSuperAdmin } from "@/services/couponService";
import {
  isValidEmail,
  checkRateLimit
} from "@/utils/security";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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

  useEffect(() => {
    // Check if user is already logged in and is super admin
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const isSuper = await isSuperAdmin();
          if (isSuper) {
            navigate("/dashboard/super-admin");
          } else {
            navigate("/dashboard");
          }
        }
      } catch (error) {
        console.error("Failed to get session:", error);
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const isSuper = await isSuperAdmin();
        if (isSuper) {
          navigate("/dashboard/super-admin");
        } else {
          // Not a super admin - redirect to regular dashboard with warning
          toast({
            title: "Access Denied",
            description: "You do not have super admin privileges.",
            variant: "destructive",
          });
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting for login attempts (5 attempts per 15 minutes)
    const rateLimit = checkRateLimit('superadmin_login', 5, 15 * 60 * 1000);
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
      localStorage.removeItem('ratelimit_superadmin_login');

      // Ensure session is fully established before navigation
      if (data.session) {
        // Check if user is super admin
        const isSuper = await isSuperAdmin();

        if (!isSuper) {
          // Not a super admin - sign out and show error
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "This account does not have super admin privileges.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Small delay to ensure session is persisted
        await new Promise(resolve => setTimeout(resolve, 200));

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
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-red-950 to-slate-950">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-orange-500 rounded-2xl flex items-center justify-center shadow-clay animate-float">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Super Admin
            </span>
          </div>
          <p className="text-gray-300 text-lg">Restricted Access Portal</p>
        </div>

        <Card className="clay-card bg-card/80 backdrop-blur-sm border-red-900/50">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-2xl font-bold text-foreground">Authorization Required</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              This area is restricted to super administrators only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-foreground font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  onBlur={() => validateEmail(email)}
                  required
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={`clay-input bg-input/50 border-border rounded-2xl py-6 ${emailError ? "border-destructive" : ""}`}
                />
                {emailError && (
                  <p id="email-error" className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  required
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  className={`clay-input bg-input/50 border-border rounded-2xl py-6 ${passwordError ? "border-destructive" : ""}`}
                />
                {passwordError && (
                  <p id="password-error" className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    {passwordError}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full clay-button bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-2xl py-6 font-semibold shadow-lg"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Sign In as Super Admin"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="w-full text-gray-400 hover:text-gray-300"
              >
                Regular User Login
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Only authorized super administrators can access this portal.</p>
          <p className="mt-1">Contact your system administrator if you need access.</p>
        </div>
      </div>
    </div>
  );
}
