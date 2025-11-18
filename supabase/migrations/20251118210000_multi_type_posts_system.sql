-- =============================================
-- MULTI-TYPE CHANNEL POSTS SYSTEM
-- =============================================
-- This migration adds support for multiple post types:
-- 1. Text posts
-- 2. Image posts
-- 3. Poll posts
-- 4. PDF posts
-- 5. Promotional text posts
-- 6. Quiz posts (existing functionality)
-- =============================================

-- ============================================
-- 1. CHANNEL POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,

  -- Post type and content
  post_type TEXT NOT NULL CHECK (post_type IN ('text', 'image', 'poll', 'pdf', 'promotional', 'quiz')),
  title TEXT,

  -- Content fields (used based on post_type)
  content TEXT, -- For text, promotional posts
  media_url TEXT, -- For image, pdf posts
  media_storage_path TEXT, -- Storage path in Supabase Storage
  poll_data JSONB, -- For poll posts: {question, options: [{text, voter_count}], is_anonymous, allows_multiple_answers}
  quiz_data JSONB, -- For quiz posts (existing quiz structure)

  -- Formatting and styling
  parse_mode TEXT DEFAULT 'HTML', -- 'HTML', 'Markdown', 'MarkdownV2'
  formatting_options JSONB, -- Additional formatting options

  -- Scheduling
  scheduled_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),

  -- Delivery tracking
  telegram_message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Metadata
  view_count INTEGER DEFAULT 0,
  engagement_data JSONB, -- Stores likes, shares, poll votes, quiz responses

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_channel_posts_user_id ON public.channel_posts(user_id);
CREATE INDEX idx_channel_posts_channel_id ON public.channel_posts(channel_id);
CREATE INDEX idx_channel_posts_type ON public.channel_posts(post_type);
CREATE INDEX idx_channel_posts_status ON public.channel_posts(status);
CREATE INDEX idx_channel_posts_scheduled_time ON public.channel_posts(scheduled_time);

-- ============================================
-- 2. ADMIN CHANNEL ASSIGNMENTS
-- ============================================
-- Maps admins to channels they can manage
-- Super admins can manage all channels

CREATE TABLE IF NOT EXISTS public.admin_channel_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,

  -- Permissions
  can_create_posts BOOLEAN NOT NULL DEFAULT true,
  can_edit_posts BOOLEAN NOT NULL DEFAULT true,
  can_delete_posts BOOLEAN NOT NULL DEFAULT false,
  can_manage_schedule BOOLEAN NOT NULL DEFAULT true,

  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Super admin who assigned
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(admin_id, channel_id)
);

CREATE INDEX idx_admin_channel_assignments_admin ON public.admin_channel_assignments(admin_id);
CREATE INDEX idx_admin_channel_assignments_channel ON public.admin_channel_assignments(channel_id);

-- ============================================
-- 3. POST TEMPLATES
-- ============================================
-- Reusable templates for posts

CREATE TABLE IF NOT EXISTS public.post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('text', 'image', 'poll', 'pdf', 'promotional', 'quiz')),

  -- Template content
  template_data JSONB NOT NULL,

  is_public BOOLEAN NOT NULL DEFAULT false, -- Public templates available to all users
  usage_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_templates_user_id ON public.post_templates(user_id);
CREATE INDEX idx_post_templates_type ON public.post_templates(post_type);
CREATE INDEX idx_post_templates_public ON public.post_templates(is_public) WHERE is_public = true;

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_channel_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

-- Channel Posts Policies

-- Users can view posts for their own channels
CREATE POLICY "Users can view their own channel posts"
ON public.channel_posts FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Admins can view posts for assigned channels
  EXISTS (
    SELECT 1 FROM public.admin_channel_assignments
    WHERE admin_id = auth.uid() AND channel_id = channel_posts.channel_id
  )
  OR
  -- Super admins can view all posts
  is_super_admin(auth.uid())
);

-- Users can create posts for their own channels
CREATE POLICY "Users can create posts for their channels"
ON public.channel_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    -- User owns the channel
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE id = channel_posts.channel_id AND user_id = auth.uid()
    )
    OR
    -- Admin has permission to create posts for this channel
    EXISTS (
      SELECT 1 FROM public.admin_channel_assignments
      WHERE admin_id = auth.uid()
      AND channel_id = channel_posts.channel_id
      AND can_create_posts = true
    )
    OR
    -- Super admin can create posts for any channel
    is_super_admin(auth.uid())
  )
);

-- Users can update their own posts or admins can update assigned channel posts
CREATE POLICY "Users can update their channel posts"
ON public.channel_posts FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.admin_channel_assignments
    WHERE admin_id = auth.uid()
    AND channel_id = channel_posts.channel_id
    AND can_edit_posts = true
  )
  OR
  is_super_admin(auth.uid())
);

-- Users can delete their own posts or admins with permission
CREATE POLICY "Users can delete their channel posts"
ON public.channel_posts FOR DELETE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.admin_channel_assignments
    WHERE admin_id = auth.uid()
    AND channel_id = channel_posts.channel_id
    AND can_delete_posts = true
  )
  OR
  is_super_admin(auth.uid())
);

-- Admin Channel Assignments Policies

-- Super admins can view all assignments
CREATE POLICY "Super admins can view all assignments"
ON public.admin_channel_assignments FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR
  auth.uid() = admin_id
);

-- Only super admins can create assignments
CREATE POLICY "Only super admins can create assignments"
ON public.admin_channel_assignments FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Only super admins can update assignments
CREATE POLICY "Only super admins can update assignments"
ON public.admin_channel_assignments FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Only super admins can delete assignments
CREATE POLICY "Only super admins can delete assignments"
ON public.admin_channel_assignments FOR DELETE
USING (is_super_admin(auth.uid()));

-- Post Templates Policies

-- Users can view their own and public templates
CREATE POLICY "Users can view their own and public templates"
ON public.post_templates FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

-- Users can create their own templates
CREATE POLICY "Users can create their own templates"
ON public.post_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
ON public.post_templates FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
ON public.post_templates FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to check if admin has access to channel
CREATE OR REPLACE FUNCTION has_channel_access(p_user_id UUID, p_channel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channels
    WHERE id = p_channel_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.admin_channel_assignments
    WHERE admin_id = p_user_id AND channel_id = p_channel_id
  ) OR is_super_admin(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's accessible channels
CREATE OR REPLACE FUNCTION get_user_accessible_channels(p_user_id UUID)
RETURNS TABLE (
  channel_id UUID,
  channel_name TEXT,
  access_type TEXT,
  permissions JSONB
) AS $$
BEGIN
  RETURN QUERY
  -- Owned channels
  SELECT
    c.id,
    c.name,
    'owner'::TEXT,
    jsonb_build_object(
      'can_create_posts', true,
      'can_edit_posts', true,
      'can_delete_posts', true,
      'can_manage_schedule', true
    )
  FROM public.channels c
  WHERE c.user_id = p_user_id

  UNION ALL

  -- Assigned channels (for admins)
  SELECT
    c.id,
    c.name,
    'admin'::TEXT,
    jsonb_build_object(
      'can_create_posts', aca.can_create_posts,
      'can_edit_posts', aca.can_edit_posts,
      'can_delete_posts', aca.can_delete_posts,
      'can_manage_schedule', aca.can_manage_schedule
    )
  FROM public.channels c
  JOIN public.admin_channel_assignments aca ON c.id = aca.channel_id
  WHERE aca.admin_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign admin to channel
CREATE OR REPLACE FUNCTION assign_admin_to_channel(
  p_admin_id UUID,
  p_channel_id UUID,
  p_can_create_posts BOOLEAN DEFAULT true,
  p_can_edit_posts BOOLEAN DEFAULT true,
  p_can_delete_posts BOOLEAN DEFAULT false,
  p_can_manage_schedule BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  -- Check if caller is super admin
  IF NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can assign admins to channels';
  END IF;

  -- Check if target user is admin
  IF NOT is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Target user must have admin role';
  END IF;

  -- Insert assignment
  INSERT INTO public.admin_channel_assignments (
    admin_id,
    channel_id,
    can_create_posts,
    can_edit_posts,
    can_delete_posts,
    can_manage_schedule,
    assigned_by
  )
  VALUES (
    p_admin_id,
    p_channel_id,
    p_can_create_posts,
    p_can_edit_posts,
    p_can_delete_posts,
    p_can_manage_schedule,
    auth.uid()
  )
  ON CONFLICT (admin_id, channel_id)
  DO UPDATE SET
    can_create_posts = EXCLUDED.can_create_posts,
    can_edit_posts = EXCLUDED.can_edit_posts,
    can_delete_posts = EXCLUDED.can_delete_posts,
    can_manage_schedule = EXCLUDED.can_manage_schedule,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = now()
  RETURNING id INTO v_assignment_id;

  -- Log activity
  INSERT INTO public.admin_activity_log (admin_id, action, details)
  VALUES (
    auth.uid(),
    'assign_admin_to_channel',
    jsonb_build_object(
      'admin_id', p_admin_id,
      'channel_id', p_channel_id,
      'permissions', jsonb_build_object(
        'can_create_posts', p_can_create_posts,
        'can_edit_posts', p_can_edit_posts,
        'can_delete_posts', p_can_delete_posts,
        'can_manage_schedule', p_can_manage_schedule
      )
    )
  );

  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE TRIGGER update_channel_posts_updated_at
BEFORE UPDATE ON public.channel_posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_templates_updated_at
BEFORE UPDATE ON public.post_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE public.channel_posts IS 'Multi-type posts for Telegram channels';
COMMENT ON TABLE public.admin_channel_assignments IS 'Admin to channel access mappings';
COMMENT ON TABLE public.post_templates IS 'Reusable post templates';

COMMENT ON COLUMN public.channel_posts.post_type IS 'Type of post: text, image, poll, pdf, promotional, quiz';
COMMENT ON COLUMN public.channel_posts.status IS 'Post status: draft, scheduled, published, failed';

COMMENT ON FUNCTION has_channel_access IS 'Check if user has access to channel';
COMMENT ON FUNCTION get_user_accessible_channels IS 'Get all channels accessible by user';
COMMENT ON FUNCTION assign_admin_to_channel IS 'Assign admin to channel with specific permissions';
