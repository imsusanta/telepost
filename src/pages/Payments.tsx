import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/LoadingState";
import { Plus, Receipt, IndianRupee, CreditCard, Banknote, Smartphone } from "lucide-react";
import { getPayments, recordOfflinePayment, getPaymentStats, type RecordPaymentInput } from "@/services/paymentService";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { isSuperAdmin } from "@/services/couponService";

export default function Payments() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState<RecordPaymentInput>({
    student_id: "",
    amount: 0,
    payment_method: "cash",
    notes: "",
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isSuperAdmin();
      setIsAdmin(admin);
    };
    checkAdmin();
  }, []);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => getPayments(),
  });

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => getPaymentStats(),
    enabled: isAdmin, // Only fetch stats for admins
  });

  const { data: students } = useQuery({
    queryKey: ['students-for-payment'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      return data || [];
    },
    enabled: isAdmin, // Only fetch students list for admins
  });

  const recordPaymentMutation = useMutation({
    mutationFn: recordOfflinePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      toast({ title: "Payment recorded successfully" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: "",
      amount: 0,
      payment_method: "cash",
      notes: "",
    });
    setIsDialogOpen(false);
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    recordPaymentMutation.mutate({
      ...formData,
      received_by: user.id,
    });
  };

  const methodIcons: Record<string, React.ReactNode> = {
    cash: <Banknote className="w-4 h-4" />,
    upi: <Smartphone className="w-4 h-4" />,
    bank_transfer: <CreditCard className="w-4 h-4" />,
    razorpay: <CreditCard className="w-4 h-4" />,
    stripe: <CreditCard className="w-4 h-4" />,
    cheque: <Receipt className="w-4 h-4" />,
  };

  const statusColors: Record<string, string> = {
    success: "bg-green-500",
    pending: "bg-yellow-500",
    failed: "bg-red-500",
    refunded: "bg-gray-500",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Record and track all fee payments" : "View your payment history"}
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Offline Payment</DialogTitle>
                  <DialogDescription>Enter payment details received from student</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Student</Label>
                    <Select
                      value={formData.student_id}
                      onValueChange={(v) => setFormData({ ...formData, student_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                      <SelectContent>
                        {students?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name || s.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(v) => setFormData({ ...formData, payment_method: v as RecordPaymentInput['payment_method'] })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={recordPaymentMutation.isPending || !formData.student_id}>
                    Record Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats Cards - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Collected</CardDescription>
                <CardTitle className="flex items-center gap-1 text-2xl text-green-600">
                  <IndianRupee className="w-5 h-5" />
                  {(stats?.total_collected || 0).toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="flex items-center gap-1 text-2xl text-yellow-600">
                  <IndianRupee className="w-5 h-5" />
                  {(stats?.total_pending || 0).toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Refunded</CardDescription>
                <CardTitle className="flex items-center gap-1 text-2xl text-gray-600">
                  <IndianRupee className="w-5 h-5" />
                  {(stats?.total_refunded || 0).toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Payments Table */}
        {isLoading ? (
          <LoadingState message="Loading payments..." />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>{payments?.length || 0} transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.receipt_number || "-"}</TableCell>
                      <TableCell>{payment.student?.full_name || payment.student?.email || "-"}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 font-medium">
                          <IndianRupee className="w-3 h-3" />
                          {payment.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {methodIcons[payment.payment_method]}
                          <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[payment.payment_status]}>
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(payment.payment_date), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {(!payments || payments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No payments recorded yet
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
