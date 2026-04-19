-- Fix for users who were created without a role or profile
-- This can happen if a trigger failed or if they existed before the triggers were set up correctly.

-- 1. Ensure all users have a profile
INSERT INTO public.profiles (id, full_name, email)
SELECT 
    id, 
    COALESCE(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', 'User'),
    COALESCE(raw_user_meta_data ->> 'email', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure all users have at least one role
-- This handles users who were created without a role (e.g. before the triggers were working)

-- First, assign owner role to those who have owner metadata AND no roles at all
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'restaurant_owner'::public.app_role
FROM auth.users
WHERE (raw_user_meta_data ->> 'user_type' = 'owner' OR raw_user_meta_data ->> 'type' = 'owner')
AND id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Second, assign customer role to anyone else who still has no roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'customer'::public.app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;
