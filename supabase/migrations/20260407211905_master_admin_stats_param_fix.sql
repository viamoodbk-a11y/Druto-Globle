
-- V3 MASTER ADMIN ANALYTICS ENGINE (OPTIMIZED)
-- Supports lazy loading by tab scope to handle large datasets.
-- Bypasses role checks for Master Admin ID: aea921b4-2541-466c-b12c-ee6617ac673b

CREATE OR REPLACE FUNCTION get_master_admin_stats_v3(p_user_id UUID, p_scope TEXT DEFAULT 'overview')
RETURNS JSON AS $$
DECLARE
    result JSON;
    stats_data JSON;
    is_master BOOLEAN;
BEGIN
    -- Check if it is the master admin bypass
    is_master := (p_user_id::text = 'aea921b4-2541-466c-b12c-ee6617ac673b');

    -- Role Check (Skip for Master)
    IF NOT is_master AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin';
    END IF;

    -- CORE STATS (Fetched for almost every scope to keep header updated)
    SELECT json_build_object(
        'totalUsers', (SELECT count(*) FROM public.profiles),
        'totalBusinesses', (SELECT count(*) FROM public.restaurants),
        'totalRewards', (SELECT count(*) FROM public.rewards WHERE is_active = true),
        'totalScans', (SELECT count(*) FROM public.scans),
        'totalClaimedRewards', (SELECT count(*) FROM public.claimed_rewards),
        'activeCards', (SELECT count(*) FROM public.loyalty_cards WHERE is_completed = false)
    ) INTO stats_data;

    IF p_scope = 'overview' OR p_scope = 'analysis' THEN
        -- Overview includes Stats + Businesses for the landing "Analysis" tab
        SELECT json_build_object(
            'stats', stats_data,
            'allBusinesses', (
                SELECT COALESCE(json_agg(b), '[]'::json) FROM (
                    SELECT r.*, p.full_name as owner_name, p.phone_number as owner_phone,
                           (SELECT count(*)::int FROM public.scans s WHERE s.restaurant_id = r.id) as scan_count
                    FROM public.restaurants r
                    LEFT JOIN public.profiles p ON r.owner_id = p.id
                    ORDER BY r.created_at DESC LIMIT 1000
                ) b
            )
        ) INTO result;
        
    ELSIF p_scope = 'users' THEN
        SELECT json_build_object(
            'stats', stats_data,
            'allUsers', (
                SELECT COALESCE(json_agg(u), '[]'::json) FROM (
                    SELECT p.id, p.full_name, p.email, p.phone_number, p.created_at, 
                           COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') as roles
                    FROM public.profiles p
                    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
                    GROUP BY p.id
                    ORDER BY p.created_at DESC LIMIT 1000
                ) u
            )
        ) INTO result;
        
    ELSIF p_scope = 'partners' THEN
        SELECT json_build_object(
            'stats', stats_data,
            'allBusinesses', (
                SELECT COALESCE(json_agg(b), '[]'::json) FROM (
                    SELECT r.*, p.full_name as owner_name, p.phone_number as owner_phone,
                           (SELECT count(*)::int FROM public.scans s WHERE s.restaurant_id = r.id) as scan_count
                    FROM public.restaurants r
                    LEFT JOIN public.profiles p ON r.owner_id = p.id
                    ORDER BY r.created_at DESC LIMIT 1000
                ) b
            )
        ) INTO result;
        
    ELSIF p_scope = 'subs' THEN
        SELECT json_build_object(
            'stats', stats_data,
            'subscriptions', (
                 SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
                    SELECT s.*, p.full_name as owner_name, r.name as restaurant_name, p.phone_number as owner_phone
                    FROM public.subscriptions s
                    LEFT JOIN public.profiles p ON s.user_id = p.id
                    LEFT JOIN public.restaurants r ON s.restaurant_id = r.id
                    ORDER BY s.created_at DESC LIMIT 1000
                ) sub
            )
        ) INTO result;
        
    ELSIF p_scope = 'logs' THEN
        SELECT json_build_object(
            'stats', stats_data,
            'recentScans', (
                SELECT COALESCE(json_agg(s), '[]'::json) FROM (
                    SELECT sc.*, p.full_name as user_name, p.phone_number as user_phone, r.name as restaurant_name
                    FROM public.scans sc
                    LEFT JOIN public.profiles p ON sc.user_id = p.id
                    LEFT JOIN public.restaurants r ON sc.restaurant_id = r.id
                    ORDER BY sc.scanned_at DESC LIMIT 100
                ) s
            ),
            'recentClaims', (
                SELECT COALESCE(json_agg(c), '[]'::json) FROM (
                    SELECT cr.*, p.full_name as user_name, p.phone_number as user_phone, r.name as restaurant_name
                    FROM public.claimed_rewards cr
                    LEFT JOIN public.profiles p ON cr.user_id = p.id
                    LEFT JOIN public.restaurants r ON cr.restaurant_id = r.id
                    ORDER BY cr.claimed_at DESC LIMIT 100
                ) c
            )
        ) INTO result;
        
    ELSE
        SELECT json_build_object('stats', stats_data) INTO result;
    END IF;

    return result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
