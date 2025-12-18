import { supabase } from "@/integrations/supabase/client";
import type { PaymentTransaction } from "./feeService";

export interface RecordPaymentInput {
  fee_assignment_id?: string;
  student_id: string;
  amount: number;
  payment_method: 'cash' | 'razorpay' | 'stripe' | 'bank_transfer' | 'upi' | 'cheque' | 'other';
  payment_gateway_id?: string;
  receipt_number?: string;
  notes?: string;
  received_by?: string;
}

// Get all payments
export const getPayments = async (filters?: {
  student_id?: string;
  status?: string;
  method?: string;
  from_date?: string;
  to_date?: string;
}): Promise<PaymentTransaction[]> => {
  let query = supabase
    .from('payment_transactions')
    .select(`
      *,
      student:profiles!payment_transactions_student_id_fkey(full_name, email)
    `)
    .order('payment_date', { ascending: false });

  if (filters?.student_id) query = query.eq('student_id', filters.student_id);
  if (filters?.status) query = query.eq('payment_status', filters.status);
  if (filters?.method) query = query.eq('payment_method', filters.method);
  if (filters?.from_date) query = query.gte('payment_date', filters.from_date);
  if (filters?.to_date) query = query.lte('payment_date', filters.to_date);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as PaymentTransaction[];
};

// Record offline payment
export const recordOfflinePayment = async (input: RecordPaymentInput): Promise<PaymentTransaction> => {
  const receiptNumber = input.receipt_number || `RCP-${Date.now()}`;
  
  const { data, error } = await supabase
    .from('payment_transactions')
    .insert({
      ...input,
      payment_status: 'success',
      receipt_number: receiptNumber,
      payment_date: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Update fee assignment status if linked
  if (input.fee_assignment_id) {
    await updateFeeAssignmentAfterPayment(input.fee_assignment_id, input.amount);
  }

  return data as unknown as PaymentTransaction;
};

// Update fee assignment after payment
const updateFeeAssignmentAfterPayment = async (feeAssignmentId: string, _paidAmount: number) => {
  // Get current assignment
  const { data: assignment } = await supabase
    .from('fee_assignments')
    .select('final_amount, status')
    .eq('id', feeAssignmentId)
    .single();

  if (!assignment) return;

  // Get total paid
  const { data: payments } = await supabase
    .from('payment_transactions')
    .select('amount')
    .eq('fee_assignment_id', feeAssignmentId)
    .eq('payment_status', 'success');

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const finalAmount = Number(assignment.final_amount);

  let newStatus = 'pending';
  if (totalPaid >= finalAmount) {
    newStatus = 'paid';
  } else if (totalPaid > 0) {
    newStatus = 'partial';
  }

  await supabase
    .from('fee_assignments')
    .update({ status: newStatus })
    .eq('id', feeAssignmentId);
};

// Generate receipt number
export const generateReceiptNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `RCP-${year}-${random}`;
};

// Refund payment
export const refundPayment = async (paymentId: string, reason?: string): Promise<PaymentTransaction> => {
  const { data, error } = await supabase
    .from('payment_transactions')
    .update({ 
      payment_status: 'refunded',
      notes: reason ? `Refund: ${reason}` : 'Refunded'
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as PaymentTransaction;
};

// Get payment statistics
export const getPaymentStats = async (dateRange?: { from: string; to: string }): Promise<{
  total_collected: number;
  total_pending: number;
  total_refunded: number;
  by_method: Record<string, number>;
  by_date: Array<{ date: string; amount: number }>;
}> => {
  let query = supabase.from('payment_transactions').select('*');
  
  if (dateRange) {
    query = query.gte('payment_date', dateRange.from).lte('payment_date', dateRange.to);
  }

  const { data: payments } = await query;
  
  const stats = {
    total_collected: 0,
    total_pending: 0,
    total_refunded: 0,
    by_method: {} as Record<string, number>,
    by_date: [] as Array<{ date: string; amount: number }>
  };

  const dateMap = new Map<string, number>();

  payments?.forEach(p => {
    const amount = Number(p.amount);
    
    if (p.payment_status === 'success') {
      stats.total_collected += amount;
      stats.by_method[p.payment_method] = (stats.by_method[p.payment_method] || 0) + amount;
      
      const date = (p.payment_date || new Date().toISOString()).split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + amount);
    } else if (p.payment_status === 'pending') {
      stats.total_pending += amount;
    } else if (p.payment_status === 'refunded') {
      stats.total_refunded += amount;
    }
  });

  stats.by_date = Array.from(dateMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return stats;
};

// Initiate Razorpay payment (frontend helper)
export const initiateRazorpayPayment = async (
  amount: number,
  studentId: string,
  feeAssignmentId?: string,
  metadata?: Record<string, unknown>
): Promise<{ orderId: string; amount: number; currency: string }> => {
  // This would typically call an edge function to create a Razorpay order
  // For now, return a placeholder - actual implementation needs Razorpay API key
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: { amount, studentId, feeAssignmentId, metadata }
  });

  if (error) throw error;
  return data;
};

// Verify Razorpay payment
export const verifyRazorpayPayment = async (
  orderId: string,
  paymentId: string,
  signature: string
): Promise<PaymentTransaction> => {
  const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
    body: { orderId, paymentId, signature }
  });

  if (error) throw error;
  return data;
};
