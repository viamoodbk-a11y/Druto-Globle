-- Update handle_new_user function to properly support Google OAuth and role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    assigned_role public.app_role;
    raw_user_type text;
BEGIN
    -- Extract user type from metadata
    raw_user_type := NEW.raw_user_meta_data ->> 'user_type';
    
    -- Map user_type to app_role
    IF raw_user_type = 'owner' THEN
        assigned_role := 'restaurant_owner';
    ELSE
        assigned_role := 'customer';
    END IF;

    -- Log for debugging (optional, can be viewed in Supabase logs)
    -- RAISE NOTICE 'Creating new user with id: %, type: %, assigned_role: %', NEW.id, raw_user_type, assigned_role;

    -- Insert into profiles with improved metadata handling
    INSERT INTO public.profiles (
        id, 
        phone_number, 
        full_name, 
        email, 
        avatar_url
    )
    VALUES (
        NEW.id,
        NEW.phone,
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name', 
            NEW.raw_user_meta_data ->> 'name', 
            NEW.raw_user_meta_data ->> 'display_name',
            'User'
        ),
        COALESCE(
            NEW.raw_user_meta_data ->> 'email',
            NEW.email
        ),
        NEW.raw_user_meta_data ->> 'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
    
    -- Assign role, preventing duplicates
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- If it's an owner, we might want to ensure they don't also have 'customer' role
    -- unless the system allows multiple roles (currently it uses maybeSingle() in AuthCallback)
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Fallback to ensure auth doesn't fail, though we'd prefer knowing why
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;
