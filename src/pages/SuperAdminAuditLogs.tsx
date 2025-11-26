import { useState, useEffect, useCallback } from 'react';
import { 
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Edit,
  Filter,
  Layers,
  Loader2,
  Plus,
  Settings,
  Tag,
  Trash,
  User,
  UserCheck,
  UserCog,
  XCircle,
  Download,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, formatDistanceToNow } from 'date-fns';
import { isSuperAdmin } from '@/services/couponService';
import { 
  getAuditLogs, 
  getActionTypeInfo, 
  type AuditLogEntry, 
  type AuditActionType 
} from '@/services/auditLogService';

const actionTypes: AuditActionType[] = [
  'user_role_changed',
  'user_status_changed',
  'user_subscription_updated',
  'user_subscription_extended',
  'user_subscription_cancelled',
  'invitation_code_created',
  'invitation_code_deleted',
  'invitation_code_updated',
  'coupon_created',
  'coupon_updated',
  'coupon_deleted',
  'system_setting_updated',
  'bulk_action_performed',
];

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UserCog,
  UserCheck,
  CreditCard,
  Clock,
  XCircle,
  Plus,
  Trash,
  Edit,
  Tag,
  Settings,
  Layers,
  Activity,
};

export default function SuperAdminAuditLogs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState<AuditActionType | 'all'>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAuditLogs(currentPage, pageSize, {
        action_type: actionTypeFilter === 'all' ? undefined : actionTypeFilter,
        start_date: startDate?.toISOString(),
        end_date: endDate?.toISOString(),
      });
      setLogs(result.logs);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, actionTypeFilter, startDate, endDate, toast]);

  useEffect(() => {
    const checkAccess = async () => {
      const hasAccess = await isSuperAdmin();
      if (!hasAccess) {
        navigate('/dashboard');
        return;
      }
      loadData();
    };
    checkAccess();
  }, [navigate, loadData]);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Admin', 'Action', 'Target', 'Details'].join(','),
      ...logs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.admin_email || 'Unknown',
        getActionTypeInfo(log.action_type as AuditActionType).label,
        log.target_email || log.target_resource_type || '-',
        JSON.stringify(log.metadata || {}).replace(/,/g, ';'),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${logs.length} log entries`,
    });
  };

  const clearFilters = () => {
    setActionTypeFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = actionTypeFilter !== 'all' || startDate || endDate;

  const getActionIcon = (actionType: AuditActionType) => {
    const info = getActionTypeInfo(actionType);
    const IconComponent = iconMap[info.icon] || Activity;
    return <IconComponent className="w-4 h-4" />;
  };

  const getActionBadge = (actionType: AuditActionType) => {
    const info = getActionTypeInfo(actionType);
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      green: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      red: 'bg-red-500/10 text-red-600 border-red-500/20',
      purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      gray: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    };

    return (
      <Badge className={`gap-1 ${colorClasses[info.color] || colorClasses.gray}`}>
        {getActionIcon(actionType)}
        {info.label}
      </Badge>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading audit logs...</p>
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
              Audit Logs
            </h1>
            <p className="text-muted-foreground">
              Track all administrative actions and changes
            </p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Actions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter(l => 
                  new Date(l.created_at).toDateString() === new Date().toDateString()
                ).length}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Page</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <Select 
                value={actionTypeFilter} 
                onValueChange={(v) => {
                  setActionTypeFilter(v as AuditActionType | 'all');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {getActionTypeInfo(type).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    {startDate ? format(startDate, 'MMM d, yyyy') : 'Start Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => { setStartDate(d); setCurrentPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    {endDate ? format(endDate, 'MMM d, yyyy') : 'End Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => { setEndDate(d); setCurrentPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-0 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Changes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="w-12 h-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No audit logs found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {format(new Date(log.created_at), 'MMM d, HH:mm')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{log.admin_name || log.admin_email}</p>
                            {log.admin_name && (
                              <p className="text-xs text-muted-foreground">{log.admin_email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action_type as AuditActionType)}
                      </TableCell>
                      <TableCell>
                        {log.target_email ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                              {log.target_email.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{log.target_email}</span>
                          </div>
                        ) : log.target_resource_type ? (
                          <span className="text-sm text-muted-foreground">
                            {log.target_resource_type}: {log.target_resource_id?.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.old_value && log.new_value ? (
                          <div className="flex items-center gap-2 text-xs">
                            <code className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">
                              {JSON.stringify(log.old_value).slice(0, 20)}...
                            </code>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <code className="bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                              {JSON.stringify(log.new_value).slice(0, 20)}...
                            </code>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
