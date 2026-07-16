import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { isSuperAdmin } from "@/services/couponService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

const TIMEOUT_MS = 8000;

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  // Initialize from localStorage cache to prevent flicker on navigation
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(() => {
    // Check cached value first for instant access on navigation
    return localStorage.getItem('is_super_admin') === 'true';
  });

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkSuperAdminWithTimeout = async (): Promise<boolean> => {
      // First check cache for quick access
      const cachedStatus = localStorage.getItem('is_super_admin');
      if (cachedStatus === 'true') {
        return true;
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Super admin check timed out");
          // On timeout, trust the cache if available
          resolve(cachedStatus === 'true');
        }, TIMEOUT_MS);

        isSuperAdmin()
          .then((result) => {
            clearTimeout(timeout);
            // Update cache
            localStorage.setItem('is_super_admin', String(result));
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeout);
            console.error("Super admin check error:", error);
            // On error, trust the cache
            resolve(cachedStatus === 'true');
          });
      });
    };

    const checkAccess = async () => {
      try {
        // Get current session first without refreshing to avoid race conditions
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted) return;

        // If we have a cached super admin status and a session, use it immediately
        const cachedSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
        if (session?.user && cachedSuperAdmin) {
          setUser(session.user);
          setHasAccess(true);
          setLoading(false);
          // Still verify in background
          checkSuperAdminWithTimeout().then((isSuper) => {
            if (isMounted && !isSuper) {
              setHasAccess(false);
              toast.error("Access denied: Super admin privileges required");
            }
          });
          return;
        }

        if (sessionError || !session?.user) {
          // Try refreshing the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (!isMounted) return;

          if (refreshError || !refreshData.session?.user) {
            console.log("No valid session found after refresh");
            setUser(null);
            setHasAccess(false);
            setLoading(false);
            return;
          }

          setUser(refreshData.session.user);
        } else {
          setUser(session.user);
        }

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
          // On error, if we have cached super admin status, trust it
          const cachedSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
          if (cachedSuperAdmin) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              setUser(session.user);
              setHasAccess(true);
              setLoading(false);
              return;
            }
          }
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
        // On timeout, if cached as super admin, grant access
        const cachedSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
        if (cachedSuperAdmin) {
          setHasAccess(true);
        }
        setLoading(false);
      }
    }, TIMEOUT_MS + 2000);

    checkAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        setHasAccess(false);
        localStorage.removeItem('is_super_admin');
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

  // If cached as super admin and still loading, show content immediately
  const cachedSuperAdmin = localStorage.getItem('is_super_admin') === 'true';
  if (loading && cachedSuperAdmin) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying access...</p>
          </div>
        </div>
      </DashboardLayout>
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
