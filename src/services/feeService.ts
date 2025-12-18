import { supabase } from "@/integrations/supabase/client";

export interface FeePlan {
  id: string;
  name: string;
  description: string | null;
  plan_type: 'monthly' | 'quarterly' | 'yearly' | 'one_time' | 'custom';
  amount: number;
  currency: string;
  course_id: string | null;
  batch_id: string | null;
  installments_allowed: boolean;
  max_installments: number;
  late_fee_percentage: number;
  grace_period_days: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  course?: { title: string };
  batch?: { name: string };
}

export interface FeeAssignment {
  id: string;
  student_id: string;
  fee_plan_id: string | null;
  enrollment_id: string | null;
  total_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  scholarship_amount: number;
  final_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  notes: string | null;
  created_at: string;
  fee_plan?: FeePlan;
  student?: { full_name: string; email: string };
}

export interface PaymentTransaction {
  id: string;
  fee_assignment_id: string | null;
  student_id: string;
  amount: number;
  payment_method: 'cash' | 'razorpay' | 'stripe' | 'bank_transfer' | 'upi' | 'cheque' | 'other';
  payment_gateway_id: string | null;
  payment_status: 'pending' | 'success' | 'failed' | 'refunded' | 'cancelled';
  payment_date: string;
  receipt_number: string | null;
  notes: string | null;
  received_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  student?: { full_name: string; email: string };
}

export interface InstallmentSchedule {
  id: string;
  fee_assignment_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_amount: number;
  payment_id: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  late_fee: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  fee_assignment_id: string | null;
  payment_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue';
  due_date: string | null;
  paid_date: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
  student?: { full_name: string; email: string };
}

// Fee Plans
export const getFeePlans = async (): Promise<FeePlan[]> => {
  const { data, error } = await supabase
    .from('fee_plans')
    .select(`
      *,
      course:courses(title),
      batch:batches(name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as FeePlan[];
};

export const createFeePlan = async (plan: Omit<FeePlan, 'id' | 'created_at' | 'course' | 'batch'>): Promise<FeePlan> => {
  const { data, error } = await supabase
    .from('fee_plans')
    .insert(plan)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as FeePlan;
};

export const updateFeePlan = async (id: string, updates: Partial<FeePlan>): Promise<FeePlan> => {
  const { data, error } = await supabase
    .from('fee_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as FeePlan;
};

export const deleteFeePlan = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('fee_plans')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Fee Assignments
export const getFeeAssignments = async (): Promise<FeeAssignment[]> => {
  const { data, error } = await supabase
    .from('fee_assignments')
    .select(`
      *,
      fee_plan:fee_plans(*),
      student:profiles!fee_assignments_student_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as FeeAssignment[];
};

export const createFeeAssignment = async (assignment: {
  student_id: string;
  fee_plan_id: string;
  enrollment_id?: string;
  total_amount: number;
  discount_amount?: number;
  coupon_code?: string;
  scholarship_amount?: number;
  final_amount: number;
  due_date?: string;
  notes?: string;
  created_by: string;
}): Promise<FeeAssignment> => {
  const { data, error } = await supabase
    .from('fee_assignments')
    .insert(assignment)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as FeeAssignment;
};

export const updateFeeAssignment = async (id: string, updates: Partial<FeeAssignment>): Promise<FeeAssignment> => {
  const { data, error } = await supabase
    .from('fee_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as FeeAssignment;
};

// Create installments for a fee assignment
export const createInstallments = async (
  feeAssignmentId: string,
  totalAmount: number,
  numInstallments: number,
  startDate: Date
): Promise<InstallmentSchedule[]> => {
  const installmentAmount = totalAmount / numInstallments;
  const installments = [];

  for (let i = 0; i < numInstallments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    installments.push({
      fee_assignment_id: feeAssignmentId,
      installment_number: i + 1,
      amount: installmentAmount,
      due_date: dueDate.toISOString(),
      status: 'pending'
    });
  }

  const { data, error } = await supabase
    .from('installment_schedules')
    .insert(installments)
    .select();

  if (error) throw error;
  return data as unknown as InstallmentSchedule[];
};

export const getInstallments = async (feeAssignmentId: string): Promise<InstallmentSchedule[]> => {
  const { data, error } = await supabase
    .from('installment_schedules')
    .select('*')
    .eq('fee_assignment_id', feeAssignmentId)
    .order('installment_number');

  if (error) throw error;
  return data as unknown as InstallmentSchedule[];
};

// Invoices
export const getInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      student:profiles!invoices_student_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as unknown as Invoice[];
};

export const createInvoice = async (invoice: {
  student_id: string;
  fee_assignment_id?: string;
  payment_id?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  due_date?: string;
  notes?: string;
}): Promise<Invoice> => {
  // Generate invoice number
  const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
  
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      ...invoice,
      invoice_number: invoiceNumber || `INV-${Date.now()}`
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Invoice;
};

export const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<Invoice> => {
  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Invoice;
};

// Payment Summary
export const getPaymentSummary = async (studentId?: string): Promise<{
  total_pending: number;
  total_paid: number;
  total_overdue: number;
  recent_payments: PaymentTransaction[];
}> => {
  let query = supabase.from('fee_assignments').select('final_amount, status');
  if (studentId) query = query.eq('student_id', studentId);
  
  const { data: assignments } = await query;
  
  const summary = {
    total_pending: 0,
    total_paid: 0,
    total_overdue: 0,
    recent_payments: [] as PaymentTransaction[]
  };
  
  assignments?.forEach(a => {
    if (a.status === 'pending' || a.status === 'partial') summary.total_pending += Number(a.final_amount);
    if (a.status === 'paid') summary.total_paid += Number(a.final_amount);
    if (a.status === 'overdue') summary.total_overdue += Number(a.final_amount);
  });

  let paymentsQuery = supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_status', 'success')
    .order('payment_date', { ascending: false })
    .limit(5);
  
  if (studentId) paymentsQuery = paymentsQuery.eq('student_id', studentId);
  
  const { data: payments } = await paymentsQuery;
  summary.recent_payments = (payments || []) as unknown as PaymentTransaction[];
  
  return summary;
};
