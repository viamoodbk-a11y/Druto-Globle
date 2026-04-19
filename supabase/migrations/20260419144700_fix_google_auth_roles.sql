-- 1. Ensure existing owners have the right priority
UPDATE public.user_roles 
SET role = 'restaurant_owner' 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data ->> 'user_type' = 'owner'
);

-- 2. If a user was meant to be an owner but only has customer role, fix it:
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'restaurant_owner'::public.app_role
FROM auth.users
WHERE raw_user_meta_data ->> 'user_type' = 'owner'
AND id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'restaurant_owner')
ON CONFLICT DO NOTHING;

-- 3. Finalize the trigger to prioritize the metadata Choice
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Create Profile
    INSERT INTO public.profiles (id, phone_number, full_name, email, avatar_url)
    VALUES (
        NEW.id,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'User'),
        COALESCE(NEW.raw_user_meta_data ->> 'email', NEW.email),
        NEW.raw_user_meta_data ->> 'avatar_url'
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    
    -- Assign Primary Role based on signup choice
    IF NEW.raw_user_meta_data ->> 'user_type' = 'owner' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'restaurant_owner')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'customer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;
