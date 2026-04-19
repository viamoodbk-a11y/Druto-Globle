-- Robust migration to ensure role assignment works every time
-- This replaces previous triggers with a more resilient version

CREATE OR REPLACE FUNCTION public.sync_user_role_from_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    is_owner_choice BOOLEAN;
    raw_info JSONB;
BEGIN
    raw_info := NEW.raw_user_meta_data;
    
    -- Detect owner choice with maximum flexibility (ILIKE and multiple keys)
    is_owner_choice := (
        COALESCE(raw_info ->> 'user_type', '') IN ('owner', 'business', 'restaurant_owner') OR 
        COALESCE(raw_info ->> 'type', '') IN ('owner', 'business') OR
        COALESCE(raw_info ->> 'role', '') IN ('owner', 'business', 'restaurant_owner') OR
        raw_info::text ILIKE '%"user_type":"owner"%' OR
        raw_info::text ILIKE '%"type":"owner"%' OR
        raw_info::text ILIKE '%"role":"owner"%' OR
        raw_info::text ILIKE '%"user_type":"business"%' OR
        raw_info::text ILIKE '%"type":"business"%' OR
        raw_info::text ILIKE '%"user_type":"restaurant_owner"%'
    );

    -- 1. Upsert Profile
    -- We use a sub-block to handle potential unique constraint violations on phone_number
    -- which can happen if someone signs up with the same phone via different accounts
    BEGIN
        INSERT INTO public.profiles (id, phone_number, full_name, email, avatar_url)
        VALUES (
            NEW.id,
            NEW.phone,
            COALESCE(raw_info ->> 'full_name', raw_info ->> 'name', 'User'),
            COALESCE(raw_info ->> 'email', NEW.email),
            raw_info ->> 'avatar_url'
        ) 
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
            avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
    EXCEPTION WHEN unique_violation THEN
        -- If phone number causes conflict, insert/update without it
        INSERT INTO public.profiles (id, full_name, email, avatar_url)
        VALUES (
            NEW.id,
            COALESCE(raw_info ->> 'full_name', raw_info ->> 'name', 'User'),
            COALESCE(raw_info ->> 'email', NEW.email),
            raw_info ->> 'avatar_url'
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
    END;

    -- 2. Assign Role
    IF is_owner_choice THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'restaurant_owner')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Optional: if they had customer role, we don't necessarily remove it
        -- as multi-role is supported, but restaurant_owner takes precedence in UI.
    ELSE
        -- Assign customer role by default only if no roles exist
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'customer')
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure triggers are correctly hooked up
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
