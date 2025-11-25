import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/services/couponService";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check current session and super admin role
    const checkAccess = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.error("Session check error:", error);
          setUser(null);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        if (!session?.user) {
          setUser(null);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setUser(session.user);

        // Check if user is super admin
        const isSuper = await isSuperAdmin();
        if (isMounted) {
          setHasAccess(isSuper);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to check access:", error);
        if (isMounted) {
          setUser(null);
          setHasAccess(false);
          setLoading(false);
        }
      }
    };

    checkAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Re-check super admin status
      const isSuper = await isSuperAdmin();
      if (isMounted) {
        setHasAccess(isSuper);
        setLoading(false);
      }
    });

    // Listen for storage changes from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (!isMounted) return;
      if (event.key && event.key.includes('supabase.auth.token')) {
        checkAccess();
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Verifying access...</div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  // Logged in but not super admin - redirect to regular dashboard
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is super admin - render children
  return <>{children}</>;
}
