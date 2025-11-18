import { supabase } from "@/integrations/supabase/client";
import {
  AdminChannelAssignment,
  AssignAdminToChannel,
} from "@/types/post";

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
}

interface AdminActivity {
  id: string;
  admin_id: string;
  action: string;
  target_user_id?: string;
  details?: any;
  created_at: string;
}

export class AdminManagementService {
  /**
   * Get all admins (super admin only)
   */
  static async getAllAdmins(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .in("role", ["admin", "super_admin"])
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to fetch admins");
    }

    return data || [];
  }

  /**
   * Create a new admin (super admin only)
   */
  static async createAdmin(
    email: string,
    fullName?: string,
    role: "admin" | "super_admin" = "admin"
  ): Promise<void> {
    // This would typically be done through Supabase Auth
    // For now, we'll just update the role of an existing user
    // In production, you'd want to send an invitation email

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("email", email);

    if (error) {
      throw new Error(error.message || "Failed to create admin");
    }
  }

  /**
   * Update admin role (super admin only)
   */
  static async updateAdminRole(
    adminId: string,
    newRole: "user" | "admin" | "super_admin"
  ): Promise<void> {
    const { error } = await supabase.rpc("admin_update_user_role", {
      target_user_id: adminId,
      new_role: newRole,
    });

    if (error) {
      throw new Error(error.message || "Failed to update admin role");
    }
  }

  /**
   * Delete admin (super admin only) - actually removes admin privileges
   */
  static async removeAdminPrivileges(adminId: string): Promise<void> {
    await this.updateAdminRole(adminId, "user");
  }

  /**
   * Get all channel assignments for an admin
   */
  static async getAdminChannelAssignments(
    adminId: string
  ): Promise<AdminChannelAssignment[]> {
    const { data, error } = await supabase
      .from("admin_channel_assignments")
      .select(`
        *,
        channel:channels(id, name, description)
      `)
      .eq("admin_id", adminId);

    if (error) {
      throw new Error(
        error.message || "Failed to fetch admin channel assignments"
      );
    }

    return data || [];
  }

  /**
   * Get all admins assigned to a channel
   */
  static async getChannelAdmins(
    channelId: string
  ): Promise<(AdminChannelAssignment & { admin: AdminUser })[]> {
    const { data, error } = await supabase
      .from("admin_channel_assignments")
      .select(`
        *,
        admin:profiles(id, email, full_name, role)
      `)
      .eq("channel_id", channelId);

    if (error) {
      throw new Error(error.message || "Failed to fetch channel admins");
    }

    return data || [];
  }

  /**
   * Assign admin to channel
   */
  static async assignAdminToChannel(
    assignment: AssignAdminToChannel
  ): Promise<string> {
    const { data, error } = await supabase.rpc("assign_admin_to_channel", {
      p_admin_id: assignment.admin_id,
      p_channel_id: assignment.channel_id,
      p_can_create_posts: assignment.can_create_posts ?? true,
      p_can_edit_posts: assignment.can_edit_posts ?? true,
      p_can_delete_posts: assignment.can_delete_posts ?? false,
      p_can_manage_schedule: assignment.can_manage_schedule ?? true,
    });

    if (error) {
      throw new Error(error.message || "Failed to assign admin to channel");
    }

    return data;
  }

  /**
   * Update admin channel permissions
   */
  static async updateAdminChannelPermissions(
    assignmentId: string,
    permissions: {
      can_create_posts?: boolean;
      can_edit_posts?: boolean;
      can_delete_posts?: boolean;
      can_manage_schedule?: boolean;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from("admin_channel_assignments")
      .update(permissions)
      .eq("id", assignmentId);

    if (error) {
      throw new Error(
        error.message || "Failed to update admin channel permissions"
      );
    }
  }

  /**
   * Remove admin from channel
   */
  static async removeAdminFromChannel(
    adminId: string,
    channelId: string
  ): Promise<void> {
    const { error } = await supabase
      .from("admin_channel_assignments")
      .delete()
      .eq("admin_id", adminId)
      .eq("channel_id", channelId);

    if (error) {
      throw new Error(error.message || "Failed to remove admin from channel");
    }
  }

  /**
   * Get admin activity log
   */
  static async getAdminActivityLog(
    adminId?: string,
    limit: number = 100
  ): Promise<AdminActivity[]> {
    let query = supabase
      .from("admin_activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (adminId) {
      query = query.eq("admin_id", adminId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message || "Failed to fetch activity log");
    }

    return data || [];
  }

  /**
   * Check if user has admin access to a channel
   */
  static async hasChannelAccess(
    userId: string,
    channelId: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("has_channel_access", {
      p_user_id: userId,
      p_channel_id: channelId,
    });

    if (error) {
      return false;
    }

    return data || false;
  }

  /**
   * Get admin dashboard statistics
   */
  static async getAdminDashboardStats(adminId: string): Promise<{
    total_channels: number;
    total_posts: number;
    posts_this_month: number;
    scheduled_posts: number;
  }> {
    // Get assigned channels
    const { data: assignments } = await supabase
      .from("admin_channel_assignments")
      .select("channel_id")
      .eq("admin_id", adminId);

    const channelIds = assignments?.map((a) => a.channel_id) || [];

    if (channelIds.length === 0) {
      return {
        total_channels: 0,
        total_posts: 0,
        posts_this_month: 0,
        scheduled_posts: 0,
      };
    }

    // Get post statistics
    const { data: posts } = await supabase
      .from("channel_posts")
      .select("status, created_at")
      .in("channel_id", channelIds);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total_channels: channelIds.length,
      total_posts: posts?.length || 0,
      posts_this_month:
        posts?.filter(
          (p) => new Date(p.created_at) >= firstDayOfMonth
        ).length || 0,
      scheduled_posts:
        posts?.filter((p) => p.status === "scheduled").length || 0,
    };

    return stats;
  }

  /**
   * Bulk assign admins to channels
   */
  static async bulkAssignAdmins(
    assignments: AssignAdminToChannel[]
  ): Promise<void> {
    const promises = assignments.map((assignment) =>
      this.assignAdminToChannel(assignment)
    );

    try {
      await Promise.all(promises);
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk assign admins");
    }
  }

  /**
   * Get admin permissions for a specific channel
   */
  static async getAdminPermissionsForChannel(
    adminId: string,
    channelId: string
  ): Promise<AdminChannelAssignment | null> {
    const { data, error } = await supabase
      .from("admin_channel_assignments")
      .select("*")
      .eq("admin_id", adminId)
      .eq("channel_id", channelId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }
}
