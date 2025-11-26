import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Copy, Key, Loader2, Plus, Trash2, Users, Shield, Search, 
  Download, CheckSquare, Filter, Sparkles, PenLine,
  CalendarOff, RotateCcw
} from "lucide-react";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  getAllInvitationCodes,
  generateInvitationCode,
  generateInvitationCodeViaEdgeFunction,
  deactivateInvitationCode,
  reactivateInvitationCode,
  deleteInvitationCode,
  createCustomInvitationCode,
  checkCodeAvailability,
  isAdmin,
  type InvitationCode,
} from '@/services/invitationService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StatusFilter = 'all' | 'active' | 'inactive' | 'expired' | 'fully_used';

export default function SuperAdminInvitations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createTab, setCreateTab] = useState<'random' | 'custom'>('random');

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Random code form state
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [batchCount, setBatchCount] = useState('1');
  const [neverExpires, setNeverExpires] = useState(false);

  // Custom code form state
  const [customCode, setCustomCode] = useState('');
  const [customMaxUses, setCustomMaxUses] = useState('1');
  const [customExpiresInDays, setCustomExpiresInDays] = useState('30');
  const [customNeverExpires, setCustomNeverExpires] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [codeAvailability, setCodeAvailability] = useState<boolean | null>(null);

  const loadInvitationCodes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllInvitationCodes();
      setInvitationCodes(data);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load invitation codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const checkAccessAndLoadCodes = useCallback(async () => {
    try {
      const hasAccess = await isAdmin();
      if (!hasAccess) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }
      await loadInvitationCodes();
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/dashboard');
    }
  }, [toast, navigate, loadInvitationCodes]);

  useEffect(() => {
    checkAccessAndLoadCodes();
  }, [checkAccessAndLoadCodes]);

  // Check custom code availability with debounce
  useEffect(() => {
    if (!customCode || customCode.length < 3) {
      setCodeAvailability(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingAvailability(true);
      try {
        const available = await checkCodeAvailability(customCode);
        setCodeAvailability(available);
      } catch {
        setCodeAvailability(null);
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [customCode]);

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getCodeStatus = (code: InvitationCode): StatusFilter => {
    if (!code.is_active) return 'inactive';
    if (isExpired(code.expires_at)) return 'expired';
    if (code.current_uses >= code.max_uses) return 'fully_used';
    return 'active';
  };

  // Filtered codes
  const filteredCodes = useMemo(() => {
    return invitationCodes.filter(code => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!code.code.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        const status = getCodeStatus(code);
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [invitationCodes, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = invitationCodes.length;
    const active = invitationCodes.filter(c => getCodeStatus(c) === 'active').length;
    const totalUses = invitationCodes.reduce((sum, c) => sum + c.current_uses, 0);
    const usedToday = invitationCodes.filter(c => {
      const today = new Date().toDateString();
      return c.current_uses > 0 && new Date(c.created_at).toDateString() === today;
    }).length;
    return { total, active, totalUses, usedToday };
  }, [invitationCodes]);

  const handleCreateRandomCodes = async () => {
    const maxUsesNum = parseInt(maxUses);
    const expiresInDaysNum = neverExpires ? null : parseInt(expiresInDays);
    const batchCountNum = parseInt(batchCount);

    if (!maxUsesNum || maxUsesNum < 1) {
      toast({ title: 'Error', description: 'Max uses must be at least 1', variant: 'destructive' });
      return;
    }

    if (!neverExpires && (!expiresInDaysNum || expiresInDaysNum < 1)) {
      toast({ title: 'Error', description: 'Expiration days must be at least 1', variant: 'destructive' });
      return;
    }

    if (!batchCountNum || batchCountNum < 1 || batchCountNum > 100) {
      toast({ title: 'Error', description: 'Batch count must be between 1 and 100', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    try {
      if (batchCountNum >= 5) {
        const result = await generateInvitationCodeViaEdgeFunction(
          batchCountNum,
          maxUsesNum,
          expiresInDaysNum || 36500 // 100 years for "never expires"
        );
        toast({ title: 'Success', description: result.message });
      } else {
        for (let i = 0; i < batchCountNum; i++) {
          await generateInvitationCode(
            maxUsesNum, 
            expiresInDaysNum || 36500,
            { batch_index: i + 1, batch_total: batchCountNum }
          );
        }
        toast({ title: 'Success', description: `Created ${batchCountNum} invitation code${batchCountNum > 1 ? 's' : ''}` });
      }

      await loadInvitationCodes();
      resetCreateDialog();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invitation codes',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateCustomCode = async () => {
    if (!customCode || customCode.length < 3) {
      toast({ title: 'Error', description: 'Custom code must be at least 3 characters', variant: 'destructive' });
      return;
    }

    if (codeAvailability === false) {
      toast({ title: 'Error', description: 'This code already exists', variant: 'destructive' });
      return;
    }

    const maxUsesNum = parseInt(customMaxUses);
    const expiresInDaysNum = customNeverExpires ? null : parseInt(customExpiresInDays);

    if (!maxUsesNum || maxUsesNum < 1) {
      toast({ title: 'Error', description: 'Max uses must be at least 1', variant: 'destructive' });
      return;
    }

    if (!customNeverExpires && (!expiresInDaysNum || expiresInDaysNum < 1)) {
      toast({ title: 'Error', description: 'Expiration days must be at least 1', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    try {
      const result = await createCustomInvitationCode(customCode, maxUsesNum, expiresInDaysNum);
      toast({ title: 'Success', description: `Created custom code: ${result.code}` });
      await loadInvitationCodes();
      resetCreateDialog();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create custom code',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setCreateTab('random');
    setMaxUses('1');
    setExpiresInDays('30');
    setBatchCount('1');
    setNeverExpires(false);
    setCustomCode('');
    setCustomMaxUses('1');
    setCustomExpiresInDays('30');
    setCustomNeverExpires(false);
    setCodeAvailability(null);
  };

  const handleToggleActive = async (code: InvitationCode) => {
    try {
      if (code.is_active) {
        await deactivateInvitationCode(code.id);
      } else {
        await reactivateInvitationCode(code.id);
      }
      toast({ title: 'Success', description: `Invitation code ${code.is_active ? 'deactivated' : 'activated'}` });
      await loadInvitationCodes();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update invitation code',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (code: InvitationCode) => {
    if (!confirm(`Are you sure you want to delete invitation code "${code.code}"?`)) return;

    try {
      await deleteInvitationCode(code.id);
      toast({ title: 'Success', description: 'Invitation code deleted' });
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(code.id);
        return next;
      });
      await loadInvitationCodes();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete invitation code',
        variant: 'destructive',
      });
    }
  };

  // Bulk operations
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCodes.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedIds).map(id => reactivateInvitationCode(id));
      await Promise.all(promises);
      toast({ title: 'Success', description: `Activated ${selectedIds.size} codes` });
      setSelectedIds(new Set());
      await loadInvitationCodes();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate codes',
        variant: 'destructive',
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedIds).map(id => deactivateInvitationCode(id));
      await Promise.all(promises);
      toast({ title: 'Success', description: `Deactivated ${selectedIds.size} codes` });
      setSelectedIds(new Set());
      await loadInvitationCodes();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate codes',
        variant: 'destructive',
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} invitation codes?`)) return;
    
    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedIds).map(id => deleteInvitationCode(id));
      await Promise.all(promises);
      toast({ title: 'Success', description: `Deleted ${selectedIds.size} codes` });
      setSelectedIds(new Set());
      await loadInvitationCodes();
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete codes',
        variant: 'destructive',
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const codesToExport = selectedIds.size > 0 
      ? filteredCodes.filter(c => selectedIds.has(c.id))
      : filteredCodes;

    const headers = ['Code', 'Status', 'Current Uses', 'Max Uses', 'Expires At', 'Created At'];
    const rows = codesToExport.map(code => [
      code.code,
      getCodeStatus(code),
      code.current_uses.toString(),
      code.max_uses.toString(),
      code.expires_at || 'Never',
      code.created_at
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported', description: `Exported ${codesToExport.length} codes to CSV` });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Invitation code copied to clipboard' });
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (code: InvitationCode) => {
    const status = getCodeStatus(code);
    switch (status) {
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'fully_used':
        return <Badge variant="outline">Fully Used</Badge>;
      default:
        return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
    }
  };

  const isCustomCode = (code: string) => {
    // Custom codes are typically shorter or have specific patterns
    return code.length <= 10 || /^[A-Z]+\d*$/.test(code) || /^[A-Z0-9]{3,8}$/.test(code);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              Invitation Codes
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage invitation-only access to your platform
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Codes
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used Today</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.usedToday}</div>
            </CardContent>
          </Card>
        </div>

        {/* Invitation Codes Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Invitation Codes</CardTitle>
                <CardDescription>
                  {selectedIds.size > 0 
                    ? `${selectedIds.size} selected` 
                    : `${filteredCodes.length} codes`}
                </CardDescription>
              </div>
              
              {/* Search and Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="fully_used">Fully Used</SelectItem>
                  </SelectContent>
                </Select>

                {/* Bulk Actions */}
                {selectedIds.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={isBulkProcessing}>
                        {isBulkProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckSquare className="h-4 w-4 mr-2" />
                        )}
                        Actions ({selectedIds.size})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={handleBulkActivate}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Activate All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkDeactivate}>
                        <CalendarOff className="h-4 w-4 mr-2" />
                        Deactivate All
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No codes match your filters'
                  : 'No invitation codes yet. Create your first one!'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === filteredCodes.length && filteredCodes.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCodes.map((code) => (
                      <TableRow key={code.id} className={selectedIds.has(code.id) ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(code.id)}
                            onCheckedChange={() => toggleSelect(code.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-bold">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[150px]">{code.code}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isCustomCode(code.code) ? (
                            <Badge variant="outline" className="gap-1">
                              <PenLine className="w-3 h-3" />
                              Custom
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Sparkles className="w-3 h-3" />
                              Random
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(code)}</TableCell>
                        <TableCell>
                          <span className={code.current_uses >= code.max_uses ? 'text-muted-foreground' : ''}>
                            {code.current_uses} / {code.max_uses}
                          </span>
                        </TableCell>
                        <TableCell className={isExpired(code.expires_at) ? 'text-destructive' : ''}>
                          {formatDate(code.expires_at)}
                        </TableCell>
                        <TableCell>{formatDate(code.created_at)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={code.is_active}
                            onCheckedChange={() => handleToggleActive(code)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(code)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog with Tabs */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && resetCreateDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Invitation Codes</DialogTitle>
            <DialogDescription>
              Generate new invitation codes for user registration
            </DialogDescription>
          </DialogHeader>

          <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as 'random' | 'custom')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="random" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Random
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-2">
                <PenLine className="w-4 h-4" />
                Custom
              </TabsTrigger>
            </TabsList>

            {/* Random Codes Tab */}
            <TabsContent value="random" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="batch-count">Number of Codes</Label>
                <Input
                  id="batch-count"
                  type="number"
                  min="1"
                  max="100"
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Create 1-100 codes at once</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-uses">Max Uses Per Code</Label>
                <Input
                  id="max-uses"
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expires-in">Expires In (Days)</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="never-expires"
                      checked={neverExpires}
                      onCheckedChange={(checked) => setNeverExpires(checked === true)}
                    />
                    <Label htmlFor="never-expires" className="text-sm font-normal cursor-pointer">
                      Never expires
                    </Label>
                  </div>
                </div>
                <Input
                  id="expires-in"
                  type="number"
                  min="1"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  disabled={neverExpires}
                />
              </div>
            </TabsContent>

            {/* Custom Code Tab */}
            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="custom-code">Custom Code</Label>
                <div className="relative">
                  <Input
                    id="custom-code"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="e.g., WELCOME2024"
                    className="uppercase"
                    maxLength={20}
                  />
                  {isCheckingAvailability && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {customCode.length >= 3 && codeAvailability !== null && (
                  <p className={`text-xs ${codeAvailability ? 'text-green-600' : 'text-destructive'}`}>
                    {codeAvailability ? '✓ Code is available' : '✗ Code already exists'}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Letters and numbers only, auto-uppercase
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-max-uses">Max Uses</Label>
                <Input
                  id="custom-max-uses"
                  type="number"
                  min="1"
                  value={customMaxUses}
                  onChange={(e) => setCustomMaxUses(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-expires">Expires In (Days)</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="custom-never-expires"
                      checked={customNeverExpires}
                      onCheckedChange={(checked) => setCustomNeverExpires(checked === true)}
                    />
                    <Label htmlFor="custom-never-expires" className="text-sm font-normal cursor-pointer">
                      Never expires
                    </Label>
                  </div>
                </div>
                <Input
                  id="custom-expires"
                  type="number"
                  min="1"
                  value={customExpiresInDays}
                  onChange={(e) => setCustomExpiresInDays(e.target.value)}
                  disabled={customNeverExpires}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={resetCreateDialog}>
              Cancel
            </Button>
            <Button 
              onClick={createTab === 'random' ? handleCreateRandomCodes : handleCreateCustomCode} 
              disabled={isCreating || (createTab === 'custom' && (customCode.length < 3 || codeAvailability === false))}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
