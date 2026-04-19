
-- 1. Add plan_tier column to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN plan_tier text NOT NULL DEFAULT 'starter';

-- 2. Create branches table
CREATE TABLE public.branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  latitude double precision,
  longitude double precision,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own branches
CREATE POLICY "Owners can manage own branches"
ON public.branches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE restaurants.id = branches.restaurant_id
    AND restaurants.owner_id = auth.uid()
  )
);

-- Anyone can view active branches (for scan matching)
CREATE POLICY "Anyone can view active branches"
ON public.branches
FOR SELECT
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add branch_id column to scans table
ALTER TABLE public.scans
ADD COLUMN branch_id uuid REFERENCES public.branches(id);
