import { useEffect, useState } from "react";
import { SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setFullName(data.full_name || "");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Settings updated successfully.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">Manage your account settings and preferences</p>
        </div>

        <Card className="clay-card-hover bg-card/50 backdrop-blur-sm border-border">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="flex items-center space-x-3 text-2xl">
              <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-xl shadow-clay-sm">
                <SettingsIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Profile Settings
              </span>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="fullName" className="text-base font-medium text-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 clay-input"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-medium text-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-12"
                />
                <p className="text-sm text-muted-foreground flex items-center space-x-1">
                  <span className="inline-block w-1.5 h-1.5 bg-muted rounded-full"></span>
                  <span>Email address is managed by your authentication provider</span>
                </p>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 px-8 clay-button bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold"
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <span className="animate-spin">⏳</span>
                      <span>Saving...</span>
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
