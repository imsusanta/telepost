import { useState, useEffect } from "react";
import { ProfileService, Profile } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const profileData = await ProfileService.fetchProfile(user.id);
      setProfile(profileData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return;

    try {
      const updated = await ProfileService.updateProfile(profile.id, updates);
      setProfile(updated);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      return updated;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  const saveTelegramConfig = async (botToken: string, channelId: string) => {
    if (!profile) return;

    try {
      const updated = await ProfileService.saveTelegramConfig(profile.id, botToken, channelId);
      setProfile(updated);
      toast({
        title: "Success",
        description: "Telegram configuration saved",
      });
      return updated;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save Telegram configuration",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    profile,
    isLoading,
    updateProfile,
    saveTelegramConfig,
    refetch: fetchProfile,
  };
}
