
CREATE OR REPLACE FUNCTION public.create_owner_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, restaurant_id, status, razorpay_plan_id, plan_tier, trial_start, trial_end)
  VALUES (NEW.owner_id, NEW.id, 'trialing', 'plan_SGMz3aZbgxgcBy', 'starter', now(), now() + interval '3 days')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;
