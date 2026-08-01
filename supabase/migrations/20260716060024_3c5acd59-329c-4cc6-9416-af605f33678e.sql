
-- 1. Tighten permissive RLS "System can ..." policies (drop; service_role bypasses RLS)
DROP POLICY IF EXISTS "System can insert coupon usage" ON public.coupon_usage;
DROP POLICY IF EXISTS "System can insert verification codes" ON public.email_verification_codes;
DROP POLICY IF EXISTS "System can insert analytics" ON public.story_analytics;
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can insert usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "System can update usage" ON public.usage_tracking;

-- Allow users to init/update their own usage_tracking row (used from client hooks)
CREATE POLICY "Users can insert own usage" ON public.usage_tracking
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON public.usage_tracking
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow users to insert story analytics only for their own stories
CREATE POLICY "Users can insert analytics for own stories" ON public.story_analytics
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.telegram_stories ts
    WHERE ts.story_id = story_analytics.story_id AND ts.user_id = auth.uid()
  ));

-- Allow users to insert verification codes only for themselves
CREATE POLICY "Users can insert own verification codes" ON public.email_verification_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. Restrict public story-media SELECT so clients cannot list the bucket
DROP POLICY IF EXISTS "Anyone can view public story media" ON storage.objects;
CREATE POLICY "Users can view own story media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'story-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Lock down SECURITY DEFINER function EXECUTE privileges
-- Revoke from anon on all app SECURITY DEFINER helpers (never intended for anon)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_teacher(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_student(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_email_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_invitation_code(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_invitation_code(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, uuid, text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_coupon(text, uuid, uuid, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_ai_usage_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calculate_attendance_percentage(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon, authenticated;

-- Trigger-only functions: revoke from all client roles (triggers still fire as table owner)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_story_expires_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_ai_settings_updated_at() FROM PUBLIC, anon, authenticated;
