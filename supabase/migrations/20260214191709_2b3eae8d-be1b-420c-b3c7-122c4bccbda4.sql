UPDATE public.subscriptions 
SET status = 'trialing', trial_start = now(), trial_end = now() + interval '3 days'
WHERE status = 'cancelled' AND razorpay_subscription_id IS NULL;