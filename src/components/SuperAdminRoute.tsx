import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/services/couponService";
import { toast } from "sonner";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

const TIMEOUT_MS = 5000;

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkSuperAdminWithTimeout = async (): Promise<boolean> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Super admin check timed out");
          resolve(false);
        }, TIMEOUT_MS);

        isSuperAdmin()
          .then((result) => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeout);
            console.error("Super admin check error:", error);
            resolve(false);
          });
      });
    };

    const checkAccess = async () => {
      try {
        // Refresh session first to ensure valid credentials
        await supabase.auth.refreshSession();

        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error || !session?.user) {
          console.log("No valid session found");
          setUser(null);
          setHasAccess(false);
          return;
        }

        setUser(session.user);

        // Check super admin with timeout
        const isSuper = await checkSuperAdminWithTimeout();
        
        if (isMounted) {
          setHasAccess(isSuper);
          if (!isSuper) {
            toast.error("Access denied: Super admin privileges required");
          }
        }
      } catch (error) {
        console.error("Failed to check access:", error);
        if (isMounted) {
          setUser(null);
          setHasAccess(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Set a fallback timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Access check fallback timeout triggered");
        setLoading(false);
      }
    }, TIMEOUT_MS + 1000);

    checkAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Re-check super admin status with setTimeout to avoid deadlock
      setTimeout(() => {
        checkSuperAdminWithTimeout().then((isSuper) => {
          if (isMounted) {
            setHasAccess(isSuper);
            setLoading(false);
          }
        });
      }, 0);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 flex items-center justify-center">
        <div className="text-white">Verifying access...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
