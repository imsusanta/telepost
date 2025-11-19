-- RSS Auto-Post Feature Migration
-- This migration adds support for automatic RSS feed parsing and posting to Telegram channels

-- Create rss_feed_sources table
CREATE TABLE IF NOT EXISTS public.rss_feed_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    feed_url TEXT NOT NULL,
    feed_title TEXT,
    feed_description TEXT,
    is_active BOOLEAN DEFAULT true,
    post_frequency TEXT DEFAULT 'daily' CHECK (post_frequency IN ('hourly', 'daily', 'weekly', 'custom')),
    custom_interval_minutes INTEGER DEFAULT NULL,
    post_format_template TEXT DEFAULT 'default',
    filters JSONB DEFAULT '{}'::JSONB, -- {keywords: [], categories: [], exclude_keywords: []}
    last_fetched_at TIMESTAMPTZ,
    last_posted_at TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}'::JSONB, -- Additional settings: {auto_generate_quiz: true, questions_per_quiz: 10}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, feed_url)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rss_feed_sources_user_id ON public.rss_feed_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_rss_feed_sources_channel_id ON public.rss_feed_sources(channel_id);
CREATE INDEX IF NOT EXISTS idx_rss_feed_sources_is_active ON public.rss_feed_sources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rss_feed_sources_last_fetched ON public.rss_feed_sources(last_fetched_at);

-- Create rss_feed_items table (parsed RSS items)
CREATE TABLE IF NOT EXISTS public.rss_feed_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_id UUID NOT NULL REFERENCES public.rss_feed_sources(id) ON DELETE CASCADE,
    item_guid TEXT NOT NULL, -- RSS item GUID for deduplication
    title TEXT NOT NULL,
    description TEXT,
    content TEXT, -- Full content if available
    link TEXT,
    image_url TEXT,
    author TEXT,
    categories TEXT[], -- Array of categories
    published_date TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    is_posted BOOLEAN DEFAULT false,
    posted_at TIMESTAMPTZ,
    telegram_message_id TEXT,
    quiz_generated BOOLEAN DEFAULT false,
    quiz_data JSONB, -- Generated quiz data
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'posted', 'failed', 'skipped')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feed_id, item_guid)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed_id ON public.rss_feed_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_status ON public.rss_feed_items(status);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_is_posted ON public.rss_feed_items(is_posted);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_published_date ON public.rss_feed_items(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_guid ON public.rss_feed_items(feed_id, item_guid);

-- Create rss_processing_log table (for monitoring and debugging)
CREATE TABLE IF NOT EXISTS public.rss_processing_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feed_id UUID REFERENCES public.rss_feed_sources(id) ON DELETE CASCADE,
    process_type TEXT NOT NULL CHECK (process_type IN ('fetch', 'parse', 'post', 'quiz_generation')),
    status TEXT NOT NULL CHECK (status IN ('started', 'success', 'error')),
    items_fetched INTEGER DEFAULT 0,
    items_posted INTEGER DEFAULT 0,
    error_message TEXT,
    processing_time_ms INTEGER,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for log queries
CREATE INDEX IF NOT EXISTS idx_rss_processing_log_feed_id ON public.rss_processing_log(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_processing_log_created_at ON public.rss_processing_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_processing_log_status ON public.rss_processing_log(status);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_rss_feed_sources_updated_at
    BEFORE UPDATE ON public.rss_feed_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rss_feed_items_updated_at
    BEFORE UPDATE ON public.rss_feed_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.rss_feed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_processing_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rss_feed_sources
CREATE POLICY "Users can view their own RSS feeds"
    ON public.rss_feed_sources
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RSS feeds"
    ON public.rss_feed_sources
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSS feeds"
    ON public.rss_feed_sources
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RSS feeds"
    ON public.rss_feed_sources
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for rss_feed_items
CREATE POLICY "Users can view items from their own RSS feeds"
    ON public.rss_feed_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.rss_feed_sources
            WHERE rss_feed_sources.id = rss_feed_items.feed_id
            AND rss_feed_sources.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items from their own RSS feeds"
    ON public.rss_feed_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.rss_feed_sources
            WHERE rss_feed_sources.id = rss_feed_items.feed_id
            AND rss_feed_sources.user_id = auth.uid()
        )
    );

-- RLS Policies for rss_processing_log
CREATE POLICY "Users can view logs for their own RSS feeds"
    ON public.rss_processing_log
    FOR SELECT
    USING (
        feed_id IS NULL OR
        EXISTS (
            SELECT 1 FROM public.rss_feed_sources
            WHERE rss_feed_sources.id = rss_processing_log.feed_id
            AND rss_feed_sources.user_id = auth.uid()
        )
    );

-- Create function to process RSS feeds
CREATE OR REPLACE FUNCTION public.process_rss_feeds_for_channels()
RETURNS void AS $$
DECLARE
    v_feed_record RECORD;
    v_should_process BOOLEAN;
    v_hours_since_last_fetch INTEGER;
BEGIN
    -- Loop through all active RSS feeds
    FOR v_feed_record IN
        SELECT * FROM public.rss_feed_sources
        WHERE is_active = true
        ORDER BY last_fetched_at ASC NULLS FIRST
        LIMIT 50 -- Process up to 50 feeds per run
    LOOP
        v_should_process := false;

        -- Check if feed should be processed based on frequency
        IF v_feed_record.last_fetched_at IS NULL THEN
            v_should_process := true;
        ELSE
            v_hours_since_last_fetch := EXTRACT(EPOCH FROM (NOW() - v_feed_record.last_fetched_at)) / 3600;

            CASE v_feed_record.post_frequency
                WHEN 'hourly' THEN
                    v_should_process := v_hours_since_last_fetch >= 1;
                WHEN 'daily' THEN
                    v_should_process := v_hours_since_last_fetch >= 24;
                WHEN 'weekly' THEN
                    v_should_process := v_hours_since_last_fetch >= 168;
                WHEN 'custom' THEN
                    IF v_feed_record.custom_interval_minutes IS NOT NULL THEN
                        v_should_process := (EXTRACT(EPOCH FROM (NOW() - v_feed_record.last_fetched_at)) / 60) >= v_feed_record.custom_interval_minutes;
                    END IF;
            END CASE;
        END IF;

        -- If should process, call the edge function
        IF v_should_process THEN
            -- This will be handled by the edge function
            -- Just log that processing is needed
            INSERT INTO public.rss_processing_log (feed_id, process_type, status, metadata)
            VALUES (
                v_feed_record.id,
                'fetch',
                'started',
                jsonb_build_object('scheduled_at', NOW())
            );

            -- Call edge function via HTTP (using pg_net extension if available)
            -- For now, the edge function will query this table and process feeds
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get pending RSS items for processing
CREATE OR REPLACE FUNCTION public.get_pending_rss_items(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    item_id UUID,
    feed_id UUID,
    feed_url TEXT,
    channel_id UUID,
    chat_id TEXT,
    item_title TEXT,
    item_description TEXT,
    item_content TEXT,
    item_link TEXT,
    item_image_url TEXT,
    published_date TIMESTAMPTZ,
    settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rfi.id as item_id,
        rfi.feed_id,
        rfs.feed_url,
        rfs.channel_id,
        c.telegram_channel_id as chat_id,
        rfi.title as item_title,
        rfi.description as item_description,
        rfi.content as item_content,
        rfi.link as item_link,
        rfi.image_url as item_image_url,
        rfi.published_date,
        rfs.settings
    FROM public.rss_feed_items rfi
    INNER JOIN public.rss_feed_sources rfs ON rfi.feed_id = rfs.id
    INNER JOIN public.channels c ON rfs.channel_id = c.id
    WHERE rfi.status = 'pending'
        AND rfi.is_posted = false
        AND rfs.is_active = true
    ORDER BY rfi.published_date ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark RSS item as posted
CREATE OR REPLACE FUNCTION public.mark_rss_item_posted(
    p_item_id UUID,
    p_telegram_message_id TEXT DEFAULT NULL,
    p_quiz_data JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE public.rss_feed_items
    SET
        status = 'posted',
        is_posted = true,
        posted_at = NOW(),
        telegram_message_id = p_telegram_message_id,
        quiz_data = p_quiz_data,
        quiz_generated = CASE WHEN p_quiz_data IS NOT NULL THEN true ELSE false END
    WHERE id = p_item_id;

    -- Update last_posted_at on feed source
    UPDATE public.rss_feed_sources
    SET last_posted_at = NOW()
    WHERE id = (SELECT feed_id FROM public.rss_feed_items WHERE id = p_item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark RSS item as failed
CREATE OR REPLACE FUNCTION public.mark_rss_item_failed(
    p_item_id UUID,
    p_error_message TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE public.rss_feed_items
    SET
        status = 'failed',
        error_message = p_error_message,
        updated_at = NOW()
    WHERE id = p_item_id;

    -- Increment error count on feed source
    UPDATE public.rss_feed_sources
    SET
        error_count = error_count + 1,
        last_error = p_error_message
    WHERE id = (SELECT feed_id FROM public.rss_feed_items WHERE id = p_item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron job to process RSS feeds every 30 minutes
SELECT cron.schedule(
    'process-rss-feeds',
    '*/30 * * * *', -- Every 30 minutes
    $$SELECT process_rss_feeds_for_channels()$$
);

-- Create view for RSS feed statistics
CREATE OR REPLACE VIEW public.rss_feed_statistics AS
SELECT
    rfs.id as feed_id,
    rfs.user_id,
    rfs.channel_id,
    rfs.feed_url,
    rfs.feed_title,
    rfs.is_active,
    rfs.post_frequency,
    rfs.last_fetched_at,
    rfs.last_posted_at,
    COUNT(rfi.id) as total_items,
    COUNT(CASE WHEN rfi.is_posted = true THEN 1 END) as posted_items,
    COUNT(CASE WHEN rfi.status = 'pending' THEN 1 END) as pending_items,
    COUNT(CASE WHEN rfi.status = 'failed' THEN 1 END) as failed_items,
    MAX(rfi.published_date) as latest_item_date,
    rfs.error_count,
    rfs.last_error
FROM public.rss_feed_sources rfs
LEFT JOIN public.rss_feed_items rfi ON rfs.id = rfi.feed_id
GROUP BY rfs.id, rfs.user_id, rfs.channel_id, rfs.feed_url, rfs.feed_title,
         rfs.is_active, rfs.post_frequency, rfs.last_fetched_at, rfs.last_posted_at,
         rfs.error_count, rfs.last_error;

-- Grant permissions
GRANT SELECT ON public.rss_feed_statistics TO authenticated;

-- Add comment
COMMENT ON TABLE public.rss_feed_sources IS 'Stores RSS feed sources configured by users for automatic posting';
COMMENT ON TABLE public.rss_feed_items IS 'Stores individual RSS feed items fetched from sources';
COMMENT ON TABLE public.rss_processing_log IS 'Logs RSS feed processing activities for monitoring';
COMMENT ON VIEW public.rss_feed_statistics IS 'Provides statistics about RSS feeds and their posting status';
