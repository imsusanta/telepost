import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isSuperAdmin } from "@/services/couponService";

interface AuthContextType {
  user: User | null;
  profile: any | null;
  isUserSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserSuperAdmin, setIsUserSuperAdmin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Use React Query for the profile to benefit from caching and auto-refetching
  const { data: profile, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Check Admin status separately (cached in localStorage via service)
  useEffect(() => {
    if (user) {
      isSuperAdmin().then(setIsUserSuperAdmin);
    } else {
      setIsUserSuperAdmin(false);
    }
  }, [user]);

  // Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setInitialized(true);
    }).catch(() => {
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setInitialized(true);
      if (_event === "SIGNED_OUT") {
        queryClient.clear();
      } else {
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    queryClient.clear();
  };

  const refetchProfile = async () => {
    await refetch();
  };

  const value = {
    user,
    profile,
    isUserSuperAdmin,
    loading: !initialized || (profileLoading && !!user),
    signOut,
    refetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
