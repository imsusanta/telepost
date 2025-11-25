import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Shield, Ticket, TrendingUp, Activity, Settings, 
  BarChart3, DollarSign, Lock, AlertCircle, CheckCircle 
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { isSuperAdmin } from '@/services/couponService';
import { getPaginatedUsers, getSubscriptionStats, getCouponStats } from '@/services/superAdminService';
import { getAllInvitationCodes } from '@/services/invitationService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    subscribed: number;
    suspended: number;
  };
  invitations: {
    total: number;
    active: number;
    used: number;
  };
  subscriptions: {
    total: number;
    active: number;
    revenue: number;
  };
  coupons: {
    total: number;
    active: number;
    totalDiscount: number;
  };
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    users: { total: 0, active: 0, subscribed: 0, suspended: 0 },
    invitations: { total: 0, active: 0, used: 0 },
    subscriptions: { total: 0, active: 0, revenue: 0 },
    coupons: { total: 0, active: 0, totalDiscount: 0 },
  });

  useEffect(() => {
    const checkAccessAndLoadData = async () => {
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
        await loadDashboardData();
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/dashboard');
      }
    };

    checkAccessAndLoadData();
  }, [navigate, toast]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [usersData, invitationsData, subscriptionData, couponData] = await Promise.all([
        getPaginatedUsers(1, 1000),
        getAllInvitationCodes(),
        getSubscriptionStats(),
        getCouponStats(),
      ]);

      setStats({
        users: {
          total: usersData.totalCount,
          active: usersData.users.filter(u => u.status === 'active').length,
          subscribed: usersData.users.filter(u => u.subscription).length,
          suspended: usersData.users.filter(u => u.status === 'suspended').length,
        },
        invitations: {
          total: invitationsData.length,
          active: invitationsData.filter(i => i.is_active && !isExpired(i.expires_at) && i.current_uses < i.max_uses).length,
          used: invitationsData.reduce((sum, i) => sum + i.current_uses, 0),
        },
        subscriptions: {
          total: subscriptionData.totalUsers,
          active: subscriptionData.activeSubscriptions,
          revenue: subscriptionData.planDistribution.reduce((sum, p) => sum + p.count * 10, 0),
        },
        coupons: {
          total: couponData.totalCoupons,
          active: couponData.activeCoupons,
          totalDiscount: couponData.totalDiscount,
        },
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Shield className="w-10 h-10 text-primary" />
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete system overview and management
            </p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">
            <Lock className="w-4 h-4 mr-2" />
            Admin Access
          </Badge>
        </div>

        {/* Main Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.users.total}</div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {stats.users.active} Active
                </span>
                <span className="text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {stats.users.suspended} Suspended
                </span>
              </div>
              <Progress value={(stats.users.active / stats.users.total) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.subscriptions.active}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.users.subscribed} users subscribed
              </p>
              <div className="text-sm font-semibold text-green-600 mt-2">
                ${stats.subscriptions.revenue}/mo revenue
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invitation Codes</CardTitle>
              <Ticket className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.invitations.total}</div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-green-600">{stats.invitations.active} Active</span>
                <span className="text-muted-foreground">{stats.invitations.used} Used</span>
              </div>
              <Progress value={(stats.invitations.active / stats.invitations.total) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coupons</CardTitle>
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.coupons.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.coupons.active} active
              </p>
              <div className="text-sm font-semibold text-yellow-600 mt-2">
                ${stats.coupons.totalDiscount.toFixed(2)} total discount
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="access">Access Control</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/dashboard/super-admin/users')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/dashboard/super-admin/invitations')}
                  >
                    <Ticket className="w-4 h-4 mr-2" />
                    Manage Invitation Codes
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/dashboard/super-admin/coupons')}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Manage Coupons
                  </Button>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    System Health
                  </CardTitle>
                  <CardDescription>Current system status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Authentication</span>
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage</span>
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Available
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Service</span>
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Overview of user accounts and subscriptions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{stats.users.active}</p>
                    <Progress value={(stats.users.active / stats.users.total) * 100} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Subscribed</p>
                    <p className="text-2xl font-bold">{stats.users.subscribed}</p>
                    <Progress value={(stats.users.subscribed / stats.users.total) * 100} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Free Users</p>
                    <p className="text-2xl font-bold">{stats.users.total - stats.users.subscribed}</p>
                    <Progress value={((stats.users.total - stats.users.subscribed) / stats.users.total) * 100} />
                  </div>
                </div>
                <Button onClick={() => navigate('/dashboard/super-admin/users')} className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  View All Users
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Invitation Codes</CardTitle>
                  <CardDescription>Control user registration access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Codes</span>
                      <span className="font-bold">{stats.invitations.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active Codes</span>
                      <span className="font-bold text-green-600">{stats.invitations.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Uses</span>
                      <span className="font-bold">{stats.invitations.used}</span>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/dashboard/super-admin/invitations')} className="w-full">
                    <Ticket className="w-4 h-4 mr-2" />
                    Manage Codes
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Discount Coupons</CardTitle>
                  <CardDescription>Promotional and discount management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Coupons</span>
                      <span className="font-bold">{stats.coupons.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Active Coupons</span>
                      <span className="font-bold text-green-600">{stats.coupons.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Discount</span>
                      <span className="font-bold text-yellow-600">${stats.coupons.totalDiscount.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/dashboard/super-admin/coupons')} className="w-full">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Manage Coupons
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Platform Analytics
                </CardTitle>
                <CardDescription>Key metrics and insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">User Growth</p>
                    <div className="text-2xl font-bold text-green-600">
                      +{stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Active user rate</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Subscription Rate</p>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.users.total > 0 ? Math.round((stats.users.subscribed / stats.users.total) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Users with paid plans</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Monthly Revenue</p>
                    <div className="text-2xl font-bold text-green-600">
                      ${stats.subscriptions.revenue}
                    </div>
                    <p className="text-xs text-muted-foreground">Recurring revenue</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Avg. User Value</p>
                    <div className="text-2xl font-bold text-purple-600">
                      ${stats.users.total > 0 ? (stats.subscriptions.revenue / stats.users.total).toFixed(2) : '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground">Per user per month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
