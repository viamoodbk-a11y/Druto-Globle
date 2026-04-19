-- Add analytics columns to notification_campaigns
ALTER TABLE public.notification_campaigns 
ADD COLUMN IF NOT EXISTS delivered_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS opened_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ticket_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent';

-- Add index for status and created_at for performance
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status ON public.notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_created_at ON public.notification_campaigns(created_at DESC);
