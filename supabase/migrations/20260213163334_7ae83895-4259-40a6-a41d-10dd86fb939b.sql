
-- Fix banner RLS: change restrictive to permissive
DROP POLICY IF EXISTS "Anyone can view active banners" ON public.hero_banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON public.hero_banners;

CREATE POLICY "Anyone can view active banners"
ON public.hero_banners
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage banners"
ON public.hero_banners
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add social links to restaurants (optional, stored as JSON)
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
