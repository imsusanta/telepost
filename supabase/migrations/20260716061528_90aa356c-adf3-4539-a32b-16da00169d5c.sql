
-- Scope invoices teacher access to teacher's own courses
DROP POLICY IF EXISTS "Teachers can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Teachers can view invoices for own courses" ON public.invoices;
CREATE POLICY "Teachers can view invoices for own courses"
ON public.invoices FOR SELECT
USING (
  is_teacher(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = invoices.student_id
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers can insert invoices for own courses" ON public.invoices;
CREATE POLICY "Teachers can insert invoices for own courses"
ON public.invoices FOR INSERT
WITH CHECK (
  is_teacher(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = invoices.student_id
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers can update invoices for own courses" ON public.invoices;
CREATE POLICY "Teachers can update invoices for own courses"
ON public.invoices FOR UPDATE
USING (
  is_teacher(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = invoices.student_id
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers can delete invoices for own courses" ON public.invoices;
CREATE POLICY "Teachers can delete invoices for own courses"
ON public.invoices FOR DELETE
USING (
  is_teacher(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = invoices.student_id
      AND c.created_by = auth.uid()
  )
);

-- Scope payment_transactions teacher access to their own courses
DROP POLICY IF EXISTS "Teachers can view payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Teachers can record payments" ON public.payment_transactions;
DROP POLICY IF EXISTS "Teachers can view payments for own courses" ON public.payment_transactions;

CREATE POLICY "Teachers can view payments for own courses"
ON public.payment_transactions FOR SELECT
USING (
  is_teacher(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = payment_transactions.student_id
      AND c.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers can insert payments for own courses" ON public.payment_transactions;
CREATE POLICY "Teachers can insert payments for own courses"
ON public.payment_transactions FOR INSERT
WITH CHECK (
  is_teacher(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = payment_transactions.student_id
      AND c.created_by = auth.uid()
  )
);

-- Restrict EXECUTE on trigger-only and privileged SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_story_expires_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_user_ai_settings_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_quiz_count(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, uuid, uuid, numeric, numeric, numeric) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_invitation_code(text, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_attendance_percentage(uuid, uuid) FROM anon, PUBLIC;

-- Anon should not run any of the user-facing SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.verify_email_code(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_invitation_code(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, uuid, text, numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ai_usage_stats(uuid) FROM anon, PUBLIC;

-- Restrict profiles UPDATE columns via trigger (prevent self-escalation of admin-controlled flags)
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow admins/service_role to change anything
  IF is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- For everyone else, forbid changing admin-controlled columns
  IF NEW.can_purchase_plans IS DISTINCT FROM OLD.can_purchase_plans
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.payment_expires_at IS DISTINCT FROM OLD.payment_expires_at
  THEN
    RAISE EXCEPTION 'Not allowed to modify admin-controlled profile fields';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM anon, authenticated, PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
