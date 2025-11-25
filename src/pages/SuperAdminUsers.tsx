import { useState, useEffect, useCallback } from 'react';
import { Ban, Check, ChevronLeft, ChevronRight, Edit, Loader2, Search, Users } from "lucide-react";
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
  extendUserSubscription,
  setCustomSubscriptionEndDate,
  type UserWithSubscription,
} from '@/services/superAdminService';
import { isSuperAdmin } from '@/services/couponService';
import { SubscriptionService, type SubscriptionPlan } from '@/services/subscriptionService';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function SuperAdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

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
        getPaginatedUsers(currentPage, pageSize, debouncedSearch),
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
  }, [currentPage, debouncedSearch, toast]);

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

  // Load data when page or search changes
  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [currentPage, debouncedSearch, loadData, loading]);

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
      
      // Update plan and optionally set custom end date
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

  const handleToggleUserStatus = async (
    userId: string,
    currentStatus: string
  ) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === 'active' ? 'activate' : 'suspend'
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user subscriptions and account status
          </p>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribed</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.subscription).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <Ban className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.status === 'suspended').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No users found' : 'No users yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {user.full_name && (
                            <p className="text-sm text-muted-foreground">
                              {user.full_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === 'active'
                              ? 'default'
                              : user.status === 'suspended'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.subscription ? (
                          <div>
                            <p className="font-medium">
                              {user.subscription.plan.display_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ${user.subscription.plan.price}/mo
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Expires: {formatDate(user.subscription.current_period_end)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Free</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.usage ? (
                          <div className="text-sm">
                            <p>{user.usage.quizzes_generated_this_month} quizzes</p>
                            <p className="text-muted-foreground">
                              {formatBytes(user.usage.total_storage_used_bytes)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSubscription(user)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Plan
                          </Button>
                          <Button
                            variant={
                              user.status === 'active' ? 'destructive' : 'default'
                            }
                            size="sm"
                            onClick={() =>
                              user.id && user.status && handleToggleUserStatus(user.id, user.status)
                            }
                            disabled={!user.id || !user.status}
                          >
                            {user.status === 'active' ? (
                              <>
                                <Ban className="h-4 w-4 mr-1" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
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
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update User Subscription</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Current Plan Info */}
            <div className="grid gap-2 p-4 bg-muted rounded-lg">
              <Label>Current Plan</Label>
              <p className="text-sm font-medium">
                {selectedUser?.subscription
                  ? selectedUser.subscription.plan.display_name
                  : 'Free (No Subscription)'}
              </p>
              {selectedUser?.subscription && (
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p>Started: {formatDate(selectedUser.subscription.current_period_start)}</p>
                  <p>Expires: {formatDate(selectedUser.subscription.current_period_end)}</p>
                  <p>Status: <Badge variant={selectedUser.subscription.status === 'active' ? 'default' : 'secondary'}>
                    {selectedUser.subscription.status}
                  </Badge></p>
                </div>
              )}
            </div>

            {/* Change Plan */}
            <div className="grid gap-2">
              <Label htmlFor="plan">Change Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.display_name} - ${plan.price}/{plan.billing_period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Extend Duration */}
            <div className="grid gap-2">
              <Label htmlFor="extend">Extend Duration</Label>
              <div className="flex gap-2">
                <Input
                  id="extend"
                  type="number"
                  min="1"
                  value={daysToExtend}
                  onChange={(e) => setDaysToExtend(Number(e.target.value))}
                  placeholder="Days"
                />
                <Button
                  variant="outline"
                  onClick={handleExtendSubscription}
                  disabled={isUpdating || !selectedUser?.subscription}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Add Days
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Extend current subscription by specified days
              </p>
            </div>

            {/* Custom End Date */}
            <div className="grid gap-2">
              <Label>Set Custom End Date</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  onClick={handleSetCustomEndDate}
                  disabled={isUpdating || !customEndDate || !selectedUser?.subscription}
                >
                  Set Date
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Override subscription end date
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSubscription} 
              disabled={isUpdating || !selectedPlanId}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
