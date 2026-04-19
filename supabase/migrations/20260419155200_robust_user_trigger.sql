-- Ensure handle_new_user is extremely robust to metadata key variations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    is_owner_choice BOOLEAN;
BEGIN
    -- Detect owner choice across multiple potential metadata keys
    is_owner_choice := (
        COALESCE(NEW.raw_user_meta_data ->> 'user_type', '') = 'owner' OR 
        COALESCE(NEW.raw_user_meta_data ->> 'type', '') = 'owner' OR
        COALESCE(NEW.raw_user_meta_data ->> 'role', '') = 'owner'
    );

    -- Create Profile with conflict handling
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
    
    -- Assign Role based on the robust check
    IF is_owner_choice THEN
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
