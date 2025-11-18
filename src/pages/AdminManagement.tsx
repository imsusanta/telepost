import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminManagementService } from "@/services/adminManagementService";
import { Shield, UserPlus, UserMinus, Settings, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface Assignment {
  id: string;
  admin_id: string;
  channel_id: string;
  can_create_posts: boolean;
  can_edit_posts: boolean;
  can_delete_posts: boolean;
  can_manage_schedule: boolean;
}

export default function AdminManagement() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [permissions, setPermissions] = useState({
    can_create_posts: true,
    can_edit_posts: true,
    can_delete_posts: false,
    can_manage_schedule: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkSuperAdminAndLoad();
  }, []);

  const checkSuperAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "You need super admin privileges to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsSuperAdmin(true);
    await loadData();
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [adminsData, channelsData, assignmentsData] = await Promise.all([
        AdminManagementService.getAllAdmins(),
        loadChannels(),
        loadAllAssignments(),
      ]);

      setAdmins(adminsData);
      setChannels(channelsData);
      setAssignments(assignmentsData);
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

  const loadChannels = async (): Promise<Channel[]> => {
    const { data, error } = await supabase
      .from("channels")
      .select("id, name, description")
      .order("name");

    if (error) throw error;
    return data || [];
  };

  const loadAllAssignments = async (): Promise<Assignment[]> => {
    const { data, error } = await supabase
      .from("admin_channel_assignments")
      .select("*");

    if (error) throw error;
    return data || [];
  };

  const handleAssignAdmin = async () => {
    if (!selectedAdmin || !selectedChannel) {
      toast({
        title: "Error",
        description: "Please select both an admin and a channel",
        variant: "destructive",
      });
      return;
    }

    try {
      await AdminManagementService.assignAdminToChannel({
        admin_id: selectedAdmin,
        channel_id: selectedChannel,
        ...permissions,
      });

      toast({
        title: "Success",
        description: "Admin assigned to channel successfully",
      });

      setAssignDialogOpen(false);
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (adminId: string, channelId: string) => {
    try {
      await AdminManagementService.removeAdminFromChannel(adminId, channelId);

      toast({
        title: "Success",
        description: "Admin removed from channel",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAdminAssignments = (adminId: string) => {
    return assignments.filter((a) => a.admin_id === adminId);
  };

  const getChannelName = (channelId: string) => {
    return channels.find((c) => c.id === channelId)?.name || "Unknown Channel";
  };

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
              Admin Management
            </h1>
            <p className="text-muted-foreground">
              Manage admin access to channels
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setAssignDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Admin
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {admins.filter((a) => a.role === "admin").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{channels.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Admins List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Admin List</h2>

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : admins.filter((a) => a.role === "admin").length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No admins yet</h3>
                <p className="text-muted-foreground">
                  Promote users to admin role from the Super Admin page
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {admins
                .filter((admin) => admin.role === "admin")
                .map((admin) => {
                  const adminAssignments = getAdminAssignments(admin.id);

                  return (
                    <Card key={admin.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {admin.email}
                              <Badge variant="secondary">Admin</Badge>
                            </CardTitle>
                            <CardDescription>
                              {admin.full_name && <span>{admin.full_name} • </span>}
                              Joined {new Date(admin.created_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Assigned Channels ({adminAssignments.length})
                            </span>
                          </div>

                          {adminAssignments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No channel assignments yet
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {adminAssignments.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">
                                      {getChannelName(assignment.channel_id)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {[
                                        assignment.can_create_posts && "Create",
                                        assignment.can_edit_posts && "Edit",
                                        assignment.can_delete_posts && "Delete",
                                        assignment.can_manage_schedule && "Schedule",
                                      ]
                                        .filter(Boolean)
                                        .join(", ")}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleRemoveAssignment(
                                        admin.id,
                                        assignment.channel_id
                                      )
                                    }
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Assign Admin Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Admin to Channel</DialogTitle>
            <DialogDescription>
              Select an admin and channel, then configure permissions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Admin</Label>
              <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an admin" />
                </SelectTrigger>
                <SelectContent>
                  {admins
                    .filter((a) => a.role === "admin")
                    .map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.email} {admin.full_name && `(${admin.full_name})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Permissions</Label>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="can-create" className="text-sm cursor-pointer">
                  Can Create Posts
                </Label>
                <Switch
                  id="can-create"
                  checked={permissions.can_create_posts}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_create_posts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="can-edit" className="text-sm cursor-pointer">
                  Can Edit Posts
                </Label>
                <Switch
                  id="can-edit"
                  checked={permissions.can_edit_posts}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_edit_posts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="can-delete" className="text-sm cursor-pointer">
                  Can Delete Posts
                </Label>
                <Switch
                  id="can-delete"
                  checked={permissions.can_delete_posts}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_delete_posts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label htmlFor="can-schedule" className="text-sm cursor-pointer">
                  Can Manage Schedule
                </Label>
                <Switch
                  id="can-schedule"
                  checked={permissions.can_manage_schedule}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_manage_schedule: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignAdmin}>Assign Admin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
