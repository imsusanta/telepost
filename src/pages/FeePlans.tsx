import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/LoadingState";
import { Plus, Edit, Trash2, IndianRupee } from "lucide-react";
import { getFeePlans, createFeePlan, updateFeePlan, deleteFeePlan, type FeePlan } from "@/services/feeService";
import { supabase } from "@/integrations/supabase/client";

export default function FeePlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FeePlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    plan_type: "monthly" as FeePlan['plan_type'],
    amount: 0,
    currency: "INR",
    installments_allowed: false,
    max_installments: 1,
    late_fee_percentage: 0,
    grace_period_days: 7,
    is_active: true,
  });

  const { data: feePlans, isLoading } = useQuery({
    queryKey: ['fee-plans'],
    queryFn: getFeePlans,
  });

  const createMutation = useMutation({
    mutationFn: createFeePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-plans'] });
      toast({ title: "Fee plan created successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FeePlan> }) => updateFeePlan(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-plans'] });
      toast({ title: "Fee plan updated successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-plans'] });
      toast({ title: "Fee plan deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      plan_type: "monthly",
      amount: 0,
      currency: "INR",
      installments_allowed: false,
      max_installments: 1,
      late_fee_percentage: 0,
      grace_period_days: 7,
      is_active: true,
    });
    setEditingPlan(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, updates: formData });
    } else {
      createMutation.mutate({ ...formData, created_by: user.id, course_id: null, batch_id: null });
    }
  };

  const handleEdit = (plan: FeePlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      plan_type: plan.plan_type,
      amount: plan.amount,
      currency: plan.currency,
      installments_allowed: plan.installments_allowed,
      max_installments: plan.max_installments,
      late_fee_percentage: plan.late_fee_percentage,
      grace_period_days: plan.grace_period_days,
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  const planTypeLabels = {
    monthly: "Monthly",
    quarterly: "Quarterly", 
    yearly: "Yearly",
    one_time: "One Time",
    custom: "Custom",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fee Plans</h1>
            <p className="text-muted-foreground">Manage fee structures for courses and batches</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Create Fee Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Edit" : "Create"} Fee Plan</DialogTitle>
                <DialogDescription>Configure fee structure with installment options</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Plan Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly Tuition Fee"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Plan Type</Label>
                    <Select
                      value={formData.plan_type}
                      onValueChange={(v) => setFormData({ ...formData, plan_type: v as FeePlan['plan_type'] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="one_time">One Time</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Allow Installments</Label>
                  <Switch
                    checked={formData.installments_allowed}
                    onCheckedChange={(v) => setFormData({ ...formData, installments_allowed: v })}
                  />
                </div>
                {formData.installments_allowed && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Max Installments</Label>
                      <Input
                        type="number"
                        value={formData.max_installments}
                        onChange={(e) => setFormData({ ...formData, max_installments: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Late Fee %</Label>
                      <Input
                        type="number"
                        value={formData.late_fee_percentage}
                        onChange={(e) => setFormData({ ...formData, late_fee_percentage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>Grace Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.grace_period_days}
                    onChange={(e) => setFormData({ ...formData, grace_period_days: Number(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPlan ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <LoadingState message="Loading fee plans..." />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Fee Plans</CardTitle>
              <CardDescription>{feePlans?.length || 0} plans configured</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Installments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feePlans?.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{planTypeLabels[plan.plan_type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" />
                          {plan.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {plan.installments_allowed ? `Up to ${plan.max_installments}` : "No"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(plan.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!feePlans || feePlans.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No fee plans created yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
