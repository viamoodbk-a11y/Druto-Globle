-- Fix the issue where OAuth signups don't pass metadata to the trigger correctly
-- This migration adds an UPDATE trigger to handle metadata syncing after the initial creation
-- and ensures the role is upgraded if the user_type is set later (e.g., in AuthCallback)

CREATE OR REPLACE FUNCTION public.sync_user_role_from_metadata()
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

    IF is_owner_choice THEN
        -- Add owner role if missing
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'restaurant_owner')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Optionally remove customer role if we want strict one-role (but usually keeping it is safer for now)
        -- DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'customer';
    END IF;

    -- Also ensure profile is updated/created
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

    RETURN NEW;
END;
$$;

-- Apply to both INSERT and UPDATE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_from_metadata();

DROP TRIGGER IF EXISTS on_auth_user_updated_metadata ON auth.users;
CREATE TRIGGER on_auth_user_updated_metadata
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.sync_user_role_from_metadata();
