import { useState, useEffect, useCallback } from "react";
import { ProfileService, Profile } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const profileData = await ProfileService.fetchProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch profile";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile) return;

    try {
      const updated = await ProfileService.updateProfile(profile.id, updates);
      setProfile(updated);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }, [profile, toast]);

  const saveTelegramConfig = useCallback(async (channelId: string) => {
    if (!profile) return;

    try {
      const updated = await ProfileService.saveTelegramConfig(profile.id, channelId);
      setProfile(updated);
      toast({
        title: "Success",
        description: "Telegram configuration saved",
      });
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save Telegram configuration";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }, [profile, toast]);

  return {
    profile,
    isLoading,
    updateProfile,
    saveTelegramConfig,
    refetch: fetchProfile,
  };
}
