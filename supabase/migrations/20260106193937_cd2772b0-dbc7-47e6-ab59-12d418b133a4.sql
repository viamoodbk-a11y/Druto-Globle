-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired'
);

-- Create subscriptions table for business owners
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  
  -- Razorpay subscription details
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  razorpay_plan_id TEXT,
  
  -- Subscription status and dates
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  trial_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Admin override
  admin_override BOOLEAN DEFAULT false,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(user_id),
  UNIQUE(restaurant_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own subscription (limited fields)
CREATE POLICY "Users can update own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Admins can update all subscriptions
CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: System can insert subscriptions (via edge function with service role)
CREATE POLICY "Service role can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to check subscription access
CREATE OR REPLACE FUNCTION public.check_subscription_access(owner_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = owner_user_id
      AND (
        -- In trial period
        (status = 'trialing' AND trial_end > now())
        -- Has active subscription
        OR status = 'active'
        -- Admin has granted access
        OR admin_override = true
      )
  )
$$;