import { useState, useEffect, useCallback } from 'react';
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Download,
  Edit,
  Loader2,
  MoreHorizontal,
  Search,
  Shield,
  
  User,
  UserCheck,
  UserCog,
  Users,
  X,
  Key,
  RefreshCw,
  CreditCard
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  getPaginatedUsers,
  updateUserSubscription,
  updateUserStatus,
  updateUserRole,
  extendUserSubscription,
  setCustomSubscriptionEndDate,
  resetUserPassword,
  type UserWithSubscription,
  type AppRole,
} from '@/services/superAdminService';
import { isSuperAdmin } from '@/services/couponService';
import { SubscriptionService, type SubscriptionPlan } from '@/services/subscriptionService';
import { approveUser } from '@/services/featureService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuperAdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Filter state
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'suspended' | 'banned' | 'pending' | 'all'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Edit subscription dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [daysToExtend, setDaysToExtend] = useState<number>(30);
  const [isUpdating, setIsUpdating] = useState(false);

  // Role change dialog
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole>('user');

  // Password Reset dialog state
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [paginatedData, plansData] = await Promise.all([
        getPaginatedUsers(
          currentPage,
          pageSize,
          debouncedSearch,
          roleFilter === 'all' ? undefined : roleFilter,
          statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'suspended' | 'banned')
        ),
        SubscriptionService.getPlans(),
      ]);
      setUsers(paginatedData.users);
      setTotalPages(paginatedData.totalPages);
      setTotalCount(paginatedData.totalCount);
      setPlans(plansData);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, roleFilter, statusFilter, toast]);

  const checkAccessAndLoadData = useCallback(async () => {
    try {
      const hasAccess = await isSuperAdmin();
      if (!hasAccess) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }
      await loadData();
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/dashboard');
    }
  }, [toast, navigate, loadData]);

  useEffect(() => {
    checkAccessAndLoadData();
  }, [checkAccessAndLoadData]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleEditSubscription = (user: UserWithSubscription) => {
    setSelectedUser(user);
    setSelectedPlanId(user.subscription?.plan_id || '');
    setCustomEndDate(
      user.subscription?.current_period_end
        ? new Date(user.subscription.current_period_end)
        : undefined
    );
    setDaysToExtend(30);
    setIsEditDialogOpen(true);
  };

  const handleEditRole = (user: UserWithSubscription) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUser || !selectedPlanId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a plan',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdating(true);

      await updateUserSubscription(
        selectedUser.id,
        selectedPlanId,
        customEndDate?.toISOString()
      );

      toast({
        title: 'Success',
        description: 'User subscription updated successfully',
      });

      setIsEditDialogOpen(false);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update subscription',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      setIsUpdating(true);
      await updateUserRole(selectedUser.id, selectedRole);

      toast({
        title: 'Success',
        description: `User role updated to ${selectedRole}`,
      });

      setIsRoleDialogOpen(false);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedUser) return;

    try {
      setIsUpdating(true);
      await extendUserSubscription(selectedUser.id, daysToExtend);

      toast({
        title: 'Success',
        description: `Subscription extended by ${daysToExtend} days`,
      });

      setIsEditDialogOpen(false);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to extend subscription',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetCustomEndDate = async () => {
    if (!selectedUser || !customEndDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select an end date',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdating(true);
      await setCustomSubscriptionEndDate(selectedUser.id, customEndDate.toISOString());

      toast({
        title: 'Success',
        description: 'Custom end date set successfully',
      });

      setIsEditDialogOpen(false);
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set custom end date',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = (user: UserWithSubscription) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsResetPasswordOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const password = Array.from(crypto.getRandomValues(new Uint32Array(12)))
      .map((x) => chars[x % chars.length])
      .join("");
    setNewPassword(password);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsResetting(true);
      await resetUserPassword(selectedUser.id, newPassword);
      toast({
        title: 'Success',
        description: `Password for ${selectedUser.email} reset successfully`,
      });
      setIsResetPasswordOpen(false);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: string
  ) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    if (
      !confirm(
        `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'
        } this user?`
      )
    ) {
      return;
    }

    try {
      await updateUserStatus(userId, newStatus as 'active' | 'suspended');
      toast({
        title: 'Success',
        description: `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`,
      });
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleApproveUser = async (user: UserWithSubscription) => {
    try {
      await approveUser(user.id);
      toast({
        title: 'User Approved',
        description: `${user.email} can now access the platform`,
      });
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve user',
        variant: 'destructive',
      });
    }
  };

  const _handleSendPaymentRequest = async (user: UserWithSubscription) => {
    if (!confirm(`Send payment request to ${user.email}? Their account will be locked until payment is complete.`)) {
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          payment_status: 'locked',
          payment_requested_at: new Date().toISOString(),
          payment_amount: 999
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Payment Request Sent',
        description: `${user.email}'s account is now locked. They must pay to access features.`,
      });
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send payment request',
        variant: 'destructive',
      });
    }
  };

  const _handleActivateForTrial = async (user: UserWithSubscription) => {
    if (!confirm(`Activate ${user.email} for trial? This will unlock their account and give full access.`)) {
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          payment_status: 'paid',
          payment_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'User Activated',
        description: `${user.email} has been activated for trial and can now access all features.`,
      });
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate user',
        variant: 'destructive',
      });
    }
  };

  // Lock user account - blocks access to Telegram Quiz features
  const handleLockAccount = async (user: UserWithSubscription) => {
    if (!confirm(`Lock account for ${user.email}? They will lose access to Telegram Quiz features until unlocked.`)) {
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ account_locked: true })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Account Locked',
        description: `${user.email}'s account has been locked. They need to pay to unlock.`,
      });
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to lock account',
        variant: 'destructive',
      });
    }
  };

  // Unlock user account - restores access to Telegram Quiz features
  const handleUnlockAccount = async (user: UserWithSubscription) => {
    if (!confirm(`Unlock account for ${user.email}? They will regain access to all features.`)) {
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ account_locked: false })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Account Unlocked',
        description: `${user.email}'s account has been unlocked. They can now access all features.`,
      });
      await loadData();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unlock account',
        variant: 'destructive',
      });
    }
  };

  const handleExportUsers = () => {
    const csvContent = [
      ['Email', 'Name', 'Role', 'Status', 'Plan', 'Joined'].join(','),
      ...users.map(u => [
        u.email,
        u.full_name || '',
        u.role,
        u.status,
        u.subscription?.plan.display_name || 'Free',
        formatDate(u.created_at)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${users.length} users to CSV`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 gap-1">
            <Crown className="w-3 h-3" />
            Super Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <User className="w-3 h-3" />
            User
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case 'active':
      case 'approved':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
            <Check className="w-3 h-3" />
            Active
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
            <Ban className="w-3 h-3" />
            Suspended
          </Badge>
        );
      case 'banned':
      case 'rejected':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
            <X className="w-3 h-3" />
            {status === 'rejected' ? 'Rejected' : 'Banned'}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (user: UserWithSubscription) => {
    // Access payment_status from user object (may not be typed yet)
    const paymentStatus = (user as any).payment_status;

    if (!paymentStatus || paymentStatus === 'pending') {
      return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
    }

    if (paymentStatus === 'locked') {
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
          <CreditCard className="w-3 h-3" />
          Payment Pending
        </Badge>
      );
    }

    if (paymentStatus === 'paid') {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
          <Check className="w-3 h-3" />
          Paid
        </Badge>
      );
    }

    return <Badge variant="outline">{paymentStatus}</Badge>;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || roleFilter !== 'all' || statusFilter !== 'all';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage users, roles, subscriptions and account status
            </p>
          </div>
          <Button onClick={handleExportUsers} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {users.filter((u) => u.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-blue-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribed</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {users.filter((u) => u.subscription).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Paid subscriptions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-gradient-to-br from-card to-amber-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Ban className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {users.filter((u) => u.status === 'suspended').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Suspended accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(v) => {
                    setRoleFilter(v as AppRole | 'all');
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as 'active' | 'suspended' | 'banned' | 'pending' | 'all');
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={clearFilters}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Payment</TableHead>
                  <TableHead className="font-semibold">Plan</TableHead>
                  <TableHead className="font-semibold">Usage</TableHead>
                  <TableHead className="font-semibold">Joined</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">
                          {hasActiveFilters ? 'No users match your filters' : 'No users yet'}
                        </p>
                        {hasActiveFilters && (
                          <Button variant="link" onClick={clearFilters} className="text-sm">
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-semibold text-sm">
                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            {user.full_name && (
                              <p className="text-sm text-muted-foreground">
                                {user.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.account_locked ? (
                          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1">
                            <X className="w-3 h-3" />
                            Payment Lock
                          </Badge>
                        ) : (
                          getStatusBadge(user.status)
                        )}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(user)}</TableCell>
                      <TableCell>
                        {user.subscription ? (
                          <div>
                            <p className="font-medium">
                              {user.subscription.plan.display_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expires: {formatDate(user.subscription.current_period_end)}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Free
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.usage ? (
                          <div className="text-sm">
                            <p className="font-medium">{user.usage.quizzes_generated_this_month} quizzes</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(user.usage.total_storage_used_bytes)} used
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditSubscription(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditRole(user)}>
                              <UserCog className="w-4 h-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                              <Key className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            {((user.status as string) === 'pending') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleApproveUser(user)}
                                  className="text-emerald-600"
                                >
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Approve User
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            {/* Account Lock/Unlock for Payment */}
                            <DropdownMenuItem
                              onClick={() => handleLockAccount(user)}
                              className="text-amber-600"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Lock Account (Payment)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUnlockAccount(user)}
                              className="text-emerald-600"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Unlock Account
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user.id, user.status)}
                              className={user.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <Ban className="w-4 h-4 mr-2" />
                                  Suspend User
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Activate User
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-9"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Edit Subscription Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit Subscription
              </DialogTitle>
              <DialogDescription>
                Manage subscription for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="plan" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="plan">Plan</TabsTrigger>
                <TabsTrigger value="extend">Extend</TabsTrigger>
                <TabsTrigger value="custom">Custom Date</TabsTrigger>
              </TabsList>

              <TabsContent value="plan" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.display_name} - {plan.price === 0 ? 'Free' : `₹${plan.price}/mo`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Feature summary for the selected plan */}
                {selectedPlanId && (() => {
                  const selectedPlan = plans.find(p => p.id === selectedPlanId);
                  if (!selectedPlan?.features) return null;
                  const f = selectedPlan.features as any;

                  const featureList = [
                    { label: `${selectedPlan.max_telegram_channels ?? 1} Telegram Channel${(selectedPlan.max_telegram_channels ?? 1) > 1 ? 's' : ''} Access`, enabled: f.channels ?? true },
                    { label: `${selectedPlan.max_pdf_storage_gb ?? 0 > 0 ? selectedPlan.max_pdf_storage_gb + 'GB' : 'No'} Storage`, enabled: (selectedPlan.max_pdf_storage_gb ?? 0) > 0 },
                    { label: `${selectedPlan.max_quizzes_per_month === null || selectedPlan.max_quizzes_per_month === -1 ? 'Unlimited' : selectedPlan.max_quizzes_per_month} Quizzes`, enabled: true },
                    { label: `${selectedPlan.max_question_bank_size === null || selectedPlan.max_question_bank_size === -1 ? 'Unlimited' : selectedPlan.max_question_bank_size} Questions Capacity`, enabled: true },
                    { label: 'Create Quiz', enabled: f.create_quiz?.enabled ?? false },
                    { label: 'Create Post', enabled: f.create_post?.enabled ?? false },
                    { label: 'Question Bank', enabled: f.question_bank?.enabled ?? false },
                    { label: 'Telegram Stories', enabled: f.stories ?? false },
                    { label: 'Knowledge Base', enabled: f.knowledge_base ?? false },
                    { label: 'Auto Scheduling', enabled: f.scheduler ?? false },
                  ];

                  return (
                    <div className="rounded-lg border p-3 space-y-1.5 bg-muted/30 max-h-48 overflow-y-auto">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Plan Features</p>
                      {featureList.map((item, idx) => (
                        <div key={idx} className={`flex items-center gap-2 text-sm ${!item.enabled ? 'text-muted-foreground line-through opacity-50' : ''}`}>
                          {item.enabled ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <Button
                  onClick={handleUpdateSubscription}
                  disabled={isUpdating || !selectedPlanId}
                  className="w-full"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Plan'
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="extend" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Days to Extend</Label>
                  <Input
                    type="number"
                    value={daysToExtend}
                    onChange={(e) => setDaysToExtend(parseInt(e.target.value) || 0)}
                    min={1}
                    max={365}
                  />
                </div>
                <Button
                  onClick={handleExtendSubscription}
                  disabled={isUpdating || daysToExtend < 1}
                  className="w-full"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extending...
                    </>
                  ) : (
                    `Extend by ${daysToExtend} days`
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Custom End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  onClick={handleSetCustomEndDate}
                  disabled={isUpdating || !customEndDate}
                  className="w-full"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting...
                    </>
                  ) : (
                    'Set End Date'
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Change User Role
              </DialogTitle>
              <DialogDescription>
                Update role for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        User
                      </div>
                    </SelectItem>
                    <SelectItem value="super_admin">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Super Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Reset User Password
              </DialogTitle>
              <DialogDescription>
                Set a new password for {selectedUser?.email}. The user will be able to log in with this new password immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-password"
                    type="text"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateRandomPassword}
                    title="Generate random password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters. Randomly generated passwords are recommended for security.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmResetPassword}
                disabled={isResetting || !newPassword}
                className="gap-2"
              >
                {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
