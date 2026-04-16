-- Create the new table for tracking push notification campaigns
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    sent_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can select their own campaigns
CREATE POLICY "Owners can view campaigns for their restaurants"
ON public.notification_campaigns
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.restaurants
        WHERE restaurants.id = notification_campaigns.restaurant_id
        AND restaurants.owner_id = auth.uid()
    )
);

-- Policy: Owners can insert campaigns for their restaurants
CREATE POLICY "Owners can insert campaigns for their restaurants"
ON public.notification_campaigns
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.restaurants
        WHERE restaurants.id = notification_campaigns.restaurant_id
        AND restaurants.owner_id = auth.uid()
    )
);

-- Policy: Service role can do everything (needed for Edge Function)
CREATE POLICY "Service role has full access to notification_campaigns"
ON public.notification_campaigns
FOR ALL
USING (true)
WITH CHECK (true);
