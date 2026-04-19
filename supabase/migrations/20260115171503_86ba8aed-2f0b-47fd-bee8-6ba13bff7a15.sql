-- Update all existing 'trialing' subscriptions to 'cancelled' (no free trial)
UPDATE public.subscriptions 
SET status = 'cancelled', updated_at = now()
WHERE status = 'trialing';

-- Change default status for new subscriptions from 'trialing' to 'cancelled'
ALTER TABLE public.subscriptions 
ALTER COLUMN status SET DEFAULT 'cancelled'::subscription_status;

-- Create function to auto-create subscription for new restaurant owners
CREATE OR REPLACE FUNCTION public.create_owner_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create cancelled (unpaid) subscription for new restaurant
  INSERT INTO public.subscriptions (user_id, restaurant_id, status, razorpay_plan_id)
  VALUES (NEW.owner_id, NEW.id, 'cancelled', 'plan_S3RftGvhHOQMVG')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create subscription when restaurant is created
DROP TRIGGER IF EXISTS on_restaurant_created_subscription ON public.restaurants;
CREATE TRIGGER on_restaurant_created_subscription
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_owner_subscription();