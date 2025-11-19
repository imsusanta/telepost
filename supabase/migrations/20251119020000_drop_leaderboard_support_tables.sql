-- Drop leaderboard and support related tables to make the app lightweight
-- This removes features that are no longer needed

-- Drop support ticket messages table (has foreign key to support_tickets)
DROP TABLE IF EXISTS public.support_ticket_messages CASCADE;

-- Drop support tickets table
DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- Drop leaderboards table
DROP TABLE IF EXISTS public.leaderboards CASCADE;

-- Remove leaderboard and support related columns from subscription_plans if they exist
DO $$
BEGIN
    -- Remove has_leaderboards column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'subscription_plans'
        AND column_name = 'has_leaderboards'
    ) THEN
        ALTER TABLE public.subscription_plans DROP COLUMN has_leaderboards;
    END IF;

    -- Remove has_priority_support column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'subscription_plans'
        AND column_name = 'has_priority_support'
    ) THEN
        ALTER TABLE public.subscription_plans DROP COLUMN has_priority_support;
    END IF;
END $$;
