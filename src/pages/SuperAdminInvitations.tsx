import { useState, useEffect } from 'react';
import { Calendar, Copy, Key, Loader2, Plus, Trash2, Users, Shield } from "lucide-react";
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
  deactivateInvitationCode,
  reactivateInvitationCode,
  deleteInvitationCode,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SuperAdminInvitations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [batchCount, setBatchCount] = useState('1');

  useEffect(() => {
    checkAccessAndLoadCodes();
  }, []);

  const checkAccessAndLoadCodes = async () => {
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
  };

  const loadInvitationCodes = async () => {
    try {
      setLoading(true);
      const data = await getAllInvitationCodes();
      setInvitationCodes(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load invitation codes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCodes = async () => {
    const maxUsesNum = parseInt(maxUses);
    const expiresInDaysNum = parseInt(expiresInDays);
    const batchCountNum = parseInt(batchCount);

    if (!maxUsesNum || maxUsesNum < 1) {
      toast({
        title: 'Error',
        description: 'Max uses must be at least 1',
        variant: 'destructive',
      });
      return;
    }

    if (!expiresInDaysNum || expiresInDaysNum < 1) {
      toast({
        title: 'Error',
        description: 'Expiration days must be at least 1',
        variant: 'destructive',
      });
      return;
    }

    if (!batchCountNum || batchCountNum < 1 || batchCountNum > 100) {
      toast({
        title: 'Error',
        description: 'Batch count must be between 1 and 100',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const newCodes: InvitationCode[] = [];

      for (let i = 0; i < batchCountNum; i++) {
        const result = await generateInvitationCode(maxUsesNum, expiresInDaysNum, {
          batch_index: i + 1,
          batch_total: batchCountNum,
        });

        // Fetch the full code details
        const codes = await getAllInvitationCodes();
        const newCode = codes.find(c => c.code === result.code);
        if (newCode) newCodes.push(newCode);
      }

      toast({
        title: 'Success',
        description: `Created ${batchCountNum} invitation code${batchCountNum > 1 ? 's' : ''}`,
      });

      await loadInvitationCodes();
      setIsCreateDialogOpen(false);
      setMaxUses('1');
      setExpiresInDays('30');
      setBatchCount('1');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invitation codes',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (code: InvitationCode) => {
    try {
      if (code.is_active) {
        await deactivateInvitationCode(code.id);
      } else {
        await reactivateInvitationCode(code.id);
      }

      toast({
        title: 'Success',
        description: `Invitation code ${code.is_active ? 'deactivated' : 'activated'}`,
      });

      await loadInvitationCodes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invitation code',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (code: InvitationCode) => {
    if (!confirm(`Are you sure you want to delete invitation code "${code.code}"?`)) {
      return;
    }

    try {
      await deleteInvitationCode(code.id);

      toast({
        title: 'Success',
        description: 'Invitation code deleted',
      });

      await loadInvitationCodes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invitation code',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Invitation code copied to clipboard',
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (code: InvitationCode) => {
    if (!code.is_active) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (isExpired(code.expires_at)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (code.current_uses >= code.max_uses) {
      return <Badge variant="secondary">Fully Used</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Active</Badge>;
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
              Manage invitation-only access to your SAAS platform
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invitationCodes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invitationCodes.filter(c => c.is_active && !isExpired(c.expires_at) && c.current_uses < c.max_uses).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invitationCodes.reduce((sum, c) => sum + c.current_uses, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitation Codes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invitation Codes</CardTitle>
            <CardDescription>
              View and manage all invitation codes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : invitationCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invitation codes yet. Create your first one!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitationCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell className="font-mono font-bold">
                          <div className="flex items-center gap-2">
                            {code.code}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(code)}</TableCell>
                        <TableCell>
                          {code.current_uses} / {code.max_uses}
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invitation Codes</DialogTitle>
            <DialogDescription>
              Generate new invitation codes for user registration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch-count">Number of Codes to Create</Label>
              <Input
                id="batch-count"
                type="number"
                min="1"
                max="100"
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                Create between 1 and 100 codes at once
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-uses">Max Uses Per Code</Label>
              <Input
                id="max-uses"
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                How many times each code can be used
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires-in">Expires In (Days)</Label>
              <Input
                id="expires-in"
                type="number"
                min="1"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Number of days until the codes expire
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCodes} disabled={isCreating}>
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
