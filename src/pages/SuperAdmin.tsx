import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Search, RefreshCw, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  can_purchase_plans: boolean;
  created_at: string;
  subscription?: {
    plan_name: string;
    status: string;
  };
}

export default function SuperAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkSuperAdminAccess();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  const checkSuperAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || profile?.role !== "super_admin") {
        toast({
          title: "Access Denied",
          description: "You do not have super admin permissions",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsSuperAdmin(true);
    } catch (error: any) {
      toast({
        title: "Access Error",
        description: "Failed to verify admin access. Please try again.",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all users with their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          role,
          can_purchase_plans,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get subscription data for each user
      const usersWithSubscriptions = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select(`
              status,
              plan:subscription_plans(name)
            `)
            .eq("user_id", profile.id)
            .eq("status", "active")
            .single();

          return {
            ...profile,
            subscription: subscription ? {
              plan_name: (subscription.plan as any)?.name || "Unknown",
              status: subscription.status,
            } : undefined,
          };
        })
      );

      setUsers(usersWithSubscriptions);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsers();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "User list updated",
    });
  };

  const togglePurchasePermission = async (userId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ can_purchase_plans: !currentValue })
        .eq("id", userId);

      if (error) throw error;

      setUsers(users.map(u =>
        u.id === userId ? { ...u, can_purchase_plans: !currentValue } : u
      ));

      toast({
        title: "Updated",
        description: `Purchase permission ${!currentValue ? "enabled" : "disabled"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole || null })
        .eq("id", userId);

      if (error) throw error;

      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole || undefined } : u
      ));

      toast({
        title: "Updated",
        description: `User role updated to ${newRole || "user"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter(u =>
    searchQuery === "" ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Shield className="w-10 h-10 text-primary" />
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage user permissions and roles
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Can Purchase Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.can_purchase_plans).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.subscription).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Super Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {users.filter(u => u.role === "super_admin").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "No matching users" : "No users found"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search"
                  : "No users in the system"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {user.email}
                        {user.role === "super_admin" && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                            Super Admin
                          </span>
                        )}
                        {user.role === "admin" && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            Admin
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {user.full_name && <span>{user.full_name} • </span>}
                        {user.subscription ? (
                          <span className="text-green-600 dark:text-green-400">
                            {user.subscription.plan_name} Plan
                          </span>
                        ) : (
                          <span>No active subscription</span>
                        )}
                        {" • "}
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {user.can_purchase_plans ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium">Can Purchase Plans</span>
                      </div>
                      <Switch
                        checked={user.can_purchase_plans}
                        onCheckedChange={() => togglePurchasePermission(user.id, user.can_purchase_plans)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Role</span>
                      <Select
                        value={user.role || "user"}
                        onValueChange={(value) => updateUserRole(user.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
