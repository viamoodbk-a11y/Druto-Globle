-- Add Google Maps review link column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS google_review_url text;