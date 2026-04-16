CREATE OR REPLACE FUNCTION public.create_owner_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, restaurant_id, status, razorpay_plan_id)
  VALUES (NEW.owner_id, NEW.id, 'cancelled', 'plan_SG8ASWogbmPEcY')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;