-- Add slug column to restaurants table
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS restaurants_slug_unique ON public.restaurants(slug);

-- Update existing restaurants with slugs based on name
UPDATE public.restaurants 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Enable realtime for scans table
ALTER PUBLICATION supabase_realtime ADD TABLE scans;