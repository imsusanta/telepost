-- Create table for scheduled Telegram quiz posts
CREATE TABLE public.scheduled_telegram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  quiz_data JSONB NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient querying of pending posts
CREATE INDEX idx_scheduled_posts_status_time ON public.scheduled_telegram_posts(status, scheduled_time) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.scheduled_telegram_posts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert scheduled posts (public quiz app)
CREATE POLICY "Anyone can schedule posts" 
ON public.scheduled_telegram_posts 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to view their scheduled posts
CREATE POLICY "Anyone can view scheduled posts" 
ON public.scheduled_telegram_posts 
FOR SELECT 
USING (true);