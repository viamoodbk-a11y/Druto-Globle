-- Diagnostic migration to capture metadata and force role detection
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS debug_metadata JSONB;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    raw_info JSONB;
    is_owner_choice BOOLEAN;
BEGIN
    raw_info := NEW.raw_user_meta_data;
    
    -- Detect owner choice with maximum flexibility
    is_owner_choice := (
        COALESCE(raw_info ->> 'user_type', '') = 'owner' OR 
        COALESCE(raw_info ->> 'type', '') = 'owner' OR
        COALESCE(raw_info ->> 'role', '') = 'owner' OR
        raw_info::text ILIKE '%"user_type":"owner"%' OR
        raw_info::text ILIKE '%"type":"owner"%' OR
        raw_info::text ILIKE '%"role":"owner"%'
    );

    -- Profile creation with metadata capture
    INSERT INTO public.profiles (id, phone_number, full_name, email, avatar_url, debug_metadata)
    VALUES (
        NEW.id,
        NEW.phone,
        COALESCE(raw_info ->> 'full_name', raw_info ->> 'name', 'User'),
        COALESCE(raw_info ->> 'email', NEW.email),
        raw_info ->> 'avatar_url',
        raw_info
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        debug_metadata = EXCLUDED.debug_metadata;
    
    -- Assign Role
    IF is_owner_choice THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'restaurant_owner')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        -- Default to customer if not explicitly 'owner'
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'customer')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;
