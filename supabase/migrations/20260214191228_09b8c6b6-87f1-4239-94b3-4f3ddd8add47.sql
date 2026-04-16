-- Update trigger to auto-start 3-day free trial for new restaurant owners
CREATE OR REPLACE FUNCTION public.create_owner_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, restaurant_id, status, razorpay_plan_id, trial_start, trial_end)
  VALUES (NEW.owner_id, NEW.id, 'trialing', 'plan_SG8ASWogbmPEcY', now(), now() + interval '3 days')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;