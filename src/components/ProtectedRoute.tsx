import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session with error handling
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session check error:", error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Failed to check session:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      // If signing in, ensure session is fully established
      if (session && _event === 'SIGNED_IN') {
        setLoading(true);
        // Longer delay to ensure session fully propagates to client and storage
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify session is actually available
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        if (!verifiedSession) {
          console.error("Session verification failed after SIGNED_IN event");
        } else {
          console.log("Session verified after login");
        }

        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
