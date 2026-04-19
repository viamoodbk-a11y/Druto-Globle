-- Migration to assign admin role to dilchanbk@gmail.com
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Find the user ID by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'dilchanbk@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- 1. Ensure the user has the admin entry in user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- 2. Update metadata to reflect the admin status for any frontend logic that uses metadata
        UPDATE auth.users 
        SET raw_user_meta_data = 
            CASE 
                WHEN raw_user_meta_data IS NULL THEN '{"user_type": "admin"}'::jsonb
                ELSE raw_user_meta_data || '{"user_type": "admin"}'::jsonb
            END
        WHERE id = v_user_id;

        RAISE NOTICE 'User dilchanbk@gmail.com has been assigned the admin role.';
    ELSE
        RAISE WARNING 'User with email dilchanbk@gmail.com not found. Please ensure the user has signed up before running this migration.';
    END IF;
END $$;
