-- Fee Plans table
CREATE TABLE public.fee_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'yearly', 'one_time', 'custom')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  installments_allowed BOOLEAN DEFAULT false,
  max_installments INTEGER DEFAULT 1,
  late_fee_percentage NUMERIC DEFAULT 0,
  grace_period_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fee Assignments table
CREATE TABLE public.fee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  fee_plan_id UUID REFERENCES public.fee_plans(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  coupon_code TEXT,
  scholarship_amount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Transactions table
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_assignment_id UUID REFERENCES public.fee_assignments(id) ON DELETE SET NULL,
  student_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'razorpay', 'stripe', 'bank_transfer', 'upi', 'cheque', 'other')),
  payment_gateway_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'success', 'failed', 'refunded', 'cancelled')),
  payment_date TIMESTAMPTZ DEFAULT now(),
  receipt_number TEXT,
  notes TEXT,
  received_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Installment Schedules table
CREATE TABLE public.installment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_assignment_id UUID REFERENCES public.fee_assignments(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  paid_amount NUMERIC DEFAULT 0,
  payment_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  late_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  student_id UUID NOT NULL,
  fee_assignment_id UUID REFERENCES public.fee_assignments(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  subtotal NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled', 'overdue')),
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance Sessions table
CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  session_type TEXT DEFAULT 'regular' CHECK (session_type IN ('regular', 'extra', 'makeup', 'exam')),
  start_time TIME,
  end_time TIME,
  created_by UUID NOT NULL,
  qr_code TEXT,
  qr_expires_at TIMESTAMPTZ,
  notes TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_id, session_date, start_time)
);

-- Attendance Records table
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'half_day')),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_method TEXT DEFAULT 'manual' CHECK (check_in_method IN ('manual', 'qr_code', 'biometric', 'auto')),
  late_minutes INTEGER DEFAULT 0,
  reason TEXT,
  marked_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- Leave Requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('sick', 'personal', 'family', 'emergency', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  supporting_doc_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Fee Plans RLS Policies
CREATE POLICY "Admins can manage all fee plans" ON public.fee_plans FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can manage own fee plans" ON public.fee_plans FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Users can view active fee plans" ON public.fee_plans FOR SELECT USING (is_active = true);

-- Fee Assignments RLS Policies
CREATE POLICY "Admins can manage all fee assignments" ON public.fee_assignments FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can view fee assignments for their courses" ON public.fee_assignments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM fee_plans fp JOIN courses c ON fp.course_id = c.id WHERE fp.id = fee_assignments.fee_plan_id AND c.created_by = auth.uid()));
CREATE POLICY "Students can view own fee assignments" ON public.fee_assignments FOR SELECT USING (auth.uid() = student_id);

-- Payment Transactions RLS Policies
CREATE POLICY "Admins can manage all payments" ON public.payment_transactions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can record payments" ON public.payment_transactions FOR INSERT WITH CHECK (is_teacher(auth.uid()));
CREATE POLICY "Teachers can view payments" ON public.payment_transactions FOR SELECT USING (is_teacher(auth.uid()));
CREATE POLICY "Students can view own payments" ON public.payment_transactions FOR SELECT USING (auth.uid() = student_id);

-- Installment Schedules RLS Policies
CREATE POLICY "Admins can manage all installments" ON public.installment_schedules FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Students can view own installments" ON public.installment_schedules FOR SELECT 
  USING (EXISTS (SELECT 1 FROM fee_assignments fa WHERE fa.id = installment_schedules.fee_assignment_id AND fa.student_id = auth.uid()));

-- Invoices RLS Policies
CREATE POLICY "Admins can manage all invoices" ON public.invoices FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can manage invoices" ON public.invoices FOR ALL USING (is_teacher(auth.uid()));
CREATE POLICY "Students can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = student_id);

-- Attendance Sessions RLS Policies
CREATE POLICY "Admins can manage all sessions" ON public.attendance_sessions FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can manage own batch sessions" ON public.attendance_sessions FOR ALL 
  USING (EXISTS (SELECT 1 FROM batches b WHERE b.id = attendance_sessions.batch_id AND b.created_by = auth.uid()));
CREATE POLICY "Students can view sessions" ON public.attendance_sessions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM enrollments e WHERE e.batch_id = attendance_sessions.batch_id AND e.student_id = auth.uid()));

-- Attendance Records RLS Policies
CREATE POLICY "Admins can manage all attendance" ON public.attendance_records FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can manage attendance" ON public.attendance_records FOR ALL USING (is_teacher(auth.uid()));
CREATE POLICY "Students can view own attendance" ON public.attendance_records FOR SELECT USING (auth.uid() = student_id);

-- Leave Requests RLS Policies
CREATE POLICY "Admins can manage all leave requests" ON public.leave_requests FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Teachers can manage leave requests for their batches" ON public.leave_requests FOR ALL 
  USING (EXISTS (SELECT 1 FROM batches b WHERE b.id = leave_requests.batch_id AND b.created_by = auth.uid()));
CREATE POLICY "Students can manage own leave requests" ON public.leave_requests FOR ALL USING (auth.uid() = student_id);

-- Create indexes for performance
CREATE INDEX idx_fee_assignments_student ON public.fee_assignments(student_id);
CREATE INDEX idx_fee_assignments_status ON public.fee_assignments(status);
CREATE INDEX idx_payment_transactions_student ON public.payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(payment_status);
CREATE INDEX idx_attendance_sessions_batch_date ON public.attendance_sessions(batch_id, session_date);
CREATE INDEX idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX idx_leave_requests_student ON public.leave_requests(student_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);

-- Triggers for updated_at
CREATE TRIGGER update_fee_plans_updated_at BEFORE UPDATE ON public.fee_plans FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_fee_assignments_updated_at BEFORE UPDATE ON public.fee_assignments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_attendance_sessions_updated_at BEFORE UPDATE ON public.attendance_sessions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count FROM invoices WHERE invoice_number LIKE 'INV-' || v_year || '-%';
  RETURN 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 5, '0');
END;
$$;

-- Function to calculate attendance percentage
CREATE OR REPLACE FUNCTION public.calculate_attendance_percentage(p_student_id UUID, p_batch_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_present INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total 
  FROM attendance_sessions 
  WHERE batch_id = p_batch_id AND status = 'completed';
  
  IF v_total = 0 THEN RETURN 0; END IF;
  
  SELECT COUNT(*) INTO v_present 
  FROM attendance_records ar
  JOIN attendance_sessions s ON ar.session_id = s.id
  WHERE ar.student_id = p_student_id 
    AND s.batch_id = p_batch_id 
    AND ar.status IN ('present', 'late');
  
  RETURN ROUND((v_present::NUMERIC / v_total::NUMERIC) * 100, 2);
END;
$$;