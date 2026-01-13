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
    let isMounted = true;

    // Check current session with error handling
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.error("Session check error:", error);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Failed to check session:", error);
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth changes - use session from event directly to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      // Use the session from the event directly - Supabase has already validated it
      // This avoids race conditions and retry loops that cause multi-tab issues
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for storage changes from other tabs to sync auth state
    const handleStorageChange = (event: StorageEvent) => {
      if (!isMounted) return;

      // Check for Supabase auth token changes from other tabs
      if (event.key && event.key.includes('supabase.auth.token')) {
        // Re-check session when auth token changes in another tab
        checkSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
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
