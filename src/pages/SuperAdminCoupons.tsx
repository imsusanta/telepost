import { useState, useEffect } from 'react';
import { Copy, DollarSign, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  getAllCoupons,
  createCoupon,
  deleteCoupon,
  toggleCouponStatus,
  generateCouponCode,
  isSuperAdmin,
  type Coupon,
} from '@/services/couponService';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminCoupons() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [maxUsesPerUser, setMaxUsesPerUser] = useState('1');
  const [validUntil, setValidUntil] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');

  useEffect(() => {
    checkAccessAndLoadCoupons();
  }, []);

  const checkAccessAndLoadCoupons = async () => {
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
      await loadCoupons();
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/dashboard');
    }
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await getAllCoupons();
      setCoupons(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load coupons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = () => {
    const newCode = generateCouponCode('QUIZ', 6);
    setCode(newCode);
  };

  const handleCreateCoupon = async () => {
    if (!code || !discountValue) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const discountVal = parseFloat(discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Discount value must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    if (discountType === 'percentage' && discountVal > 100) {
      toast({
        title: 'Validation Error',
        description: 'Percentage discount cannot exceed 100%',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      await createCoupon({
        code: code.toUpperCase(),
        description: description || undefined,
        discount_type: discountType,
        discount_value: discountVal,
        max_uses: maxUses ? parseInt(maxUses) : undefined,
        max_uses_per_user: maxUsesPerUser ? parseInt(maxUsesPerUser) : 1,
        valid_until: validUntil || undefined,
        min_purchase_amount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : undefined,
      });

      toast({
        title: 'Success',
        description: 'Coupon created successfully',
      });

      // Reset form
      setCode('');
      setDescription('');
      setDiscountValue('');
      setMaxUses('');
      setMaxUsesPerUser('1');
      setValidUntil('');
      setMinPurchaseAmount('');
      setIsCreateDialogOpen(false);

      // Reload coupons
      await loadCoupons();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create coupon',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete coupon "${code}"?`)) {
      return;
    }

    try {
      await deleteCoupon(couponId);
      toast({
        title: 'Success',
        description: 'Coupon deleted successfully',
      });
      await loadCoupons();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete coupon',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      await toggleCouponStatus(couponId, !currentStatus);
      toast({
        title: 'Success',
        description: `Coupon ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      await loadCoupons();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update coupon status',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Coupon code copied to clipboard',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Coupon Management</h1>
            <p className="text-muted-foreground">Create and manage discount coupons</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Coupon
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coupons.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
              <Tag className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coupons.filter((c) => c.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {coupons.reduce((sum, c) => sum + c.current_uses, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupons List */}
        <div className="grid gap-4">
          {coupons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No coupons created yet</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                  Create Your First Coupon
                </Button>
              </CardContent>
            </Card>
          ) : (
            coupons.map((coupon) => (
              <Card key={coupon.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-mono">
                          {coupon.code}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(coupon.code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {coupon.description && (
                        <CardDescription>{coupon.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={() =>
                          handleToggleStatus(coupon.id, coupon.is_active)
                        }
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Discount</p>
                      <p className="font-semibold">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `$${coupon.discount_value}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Usage</p>
                      <p className="font-semibold">
                        {coupon.current_uses}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : ' / ∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Per User Limit</p>
                      <p className="font-semibold">
                        {coupon.max_uses_per_user || '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-semibold">
                        {coupon.valid_until
                          ? formatDate(coupon.valid_until)
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Create Coupon Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              Generate a discount coupon for your users
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Coupon Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER2024"
                  className="font-mono"
                />
                <Button type="button" onClick={handleGenerateCode}>
                  Generate
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summer sale discount"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="discountType">Discount Type *</Label>
                <Select
                  value={discountType}
                  onValueChange={(value: 'percentage' | 'fixed_amount') =>
                    setDiscountType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="discountValue">
                  Discount Value * {discountType === 'percentage' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '20' : '10.00'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxUses">Max Total Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="100 (leave empty for unlimited)"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="maxUsesPerUser">Max Uses Per User</Label>
                <Input
                  id="maxUsesPerUser"
                  type="number"
                  min="1"
                  value={maxUsesPerUser}
                  onChange={(e) => setMaxUsesPerUser(e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="validUntil">Valid Until (Optional)</Label>
              <Input
                id="validUntil"
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="minPurchaseAmount">
                Minimum Purchase Amount (Optional)
              </Label>
              <Input
                id="minPurchaseAmount"
                type="number"
                step="0.01"
                min="0"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                placeholder="29.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCoupon} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Coupon'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
