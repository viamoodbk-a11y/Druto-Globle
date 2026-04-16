
-- V4 MASTER ADMIN ANALYTICS ENGINE (PAGINATED & SEARCHABLE)
-- Supports efficient pagination and global search to handle massive datasets.

CREATE OR REPLACE FUNCTION get_master_admin_stats_v4(
    p_user_id UUID, 
    p_scope TEXT DEFAULT 'overview',
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 50,
    p_search TEXT DEFAULT ''
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    stats_data JSON;
    is_master BOOLEAN;
    offset_val INT;
    search_term TEXT;
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

    -- Prepare pagination
    offset_val := (p_page - 1) * p_page_size;
    search_term := '%' || COALESCE(p_search, '') || '%';

    -- CORE STATS (Always returned)
    SELECT json_build_object(
        'totalUsers', (SELECT count(*)::int FROM public.profiles),
        'totalBusinesses', (SELECT count(*)::int FROM public.restaurants),
        'totalRewards', (SELECT count(*)::int FROM public.rewards WHERE is_active = true),
        'totalScans', (SELECT count(*)::int FROM public.scans),
        'totalClaimedRewards', (SELECT count(*)::int FROM public.claimed_rewards),
        'activeCards', (SELECT count(*)::int FROM public.loyalty_cards WHERE is_completed = false)
    ) INTO stats_data;

    IF p_scope = 'overview' OR p_scope = 'analysis' OR p_scope = 'partners' THEN
        SELECT json_build_object(
            'stats', stats_data,
            'total_count', (
                SELECT count(*)::int FROM public.restaurants r
                LEFT JOIN public.profiles p ON r.owner_id = p.id
                WHERE (r.name ILIKE search_term OR p.full_name ILIKE search_term OR r.city ILIKE search_term OR p.phone_number ILIKE search_term)
            ),
            'allBusinesses', (
                SELECT COALESCE(json_agg(b), '[]'::json) FROM (
                    SELECT r.*, p.full_name as owner_name, p.phone_number as owner_phone,
                           (SELECT count(*)::int FROM public.scans s WHERE s.restaurant_id = r.id) as scan_count
                    FROM public.restaurants r
                    LEFT JOIN public.profiles p ON r.owner_id = p.id
                    WHERE (r.name ILIKE search_term OR p.full_name ILIKE search_term OR r.city ILIKE search_term OR p.phone_number ILIKE search_term)
                    ORDER BY 
                        CASE WHEN p_scope = 'analysis' THEN (SELECT count(*) FROM public.scans s WHERE s.restaurant_id = r.id) ELSE 0 END DESC,
                        r.created_at DESC 
                    LIMIT p_page_size OFFSET offset_val
                ) b
            )
        ) INTO result;
        
    ELSIF p_scope = 'users' THEN
        SELECT json_build_object(
            'stats', stats_data,
            'total_count', (
                SELECT count(*)::int FROM public.profiles p
                WHERE (p.full_name ILIKE search_term OR p.email ILIKE search_term OR p.phone_number ILIKE search_term OR p.id::text ILIKE search_term)
            ),
            'allUsers', (
                SELECT COALESCE(json_agg(u), '[]'::json) FROM (
                    SELECT p.id, p.full_name, p.email, p.phone_number, p.created_at, 
                           COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}') as roles
                    FROM public.profiles p
                    LEFT JOIN public.user_roles ur ON p.id = ur.user_id
                    WHERE (p.full_name ILIKE search_term OR p.email ILIKE search_term OR p.phone_number ILIKE search_term OR p.id::text ILIKE search_term)
                    GROUP BY p.id
                    ORDER BY p.created_at DESC 
                    LIMIT p_page_size OFFSET offset_val
                ) u
            )
        ) INTO result;
        
    ELSIF p_scope = 'subs' THEN
        SELECT json_build_object(
            'stats', stats_data,
            'total_count', (
                SELECT count(*)::int FROM public.subscriptions s
                LEFT JOIN public.profiles p ON s.user_id = p.id
                LEFT JOIN public.restaurants r ON s.restaurant_id = r.id
                WHERE (r.name ILIKE search_term OR p.full_name ILIKE search_term OR p.phone_number ILIKE search_term)
            ),
            'subscriptions', (
                 SELECT COALESCE(json_agg(sub), '[]'::json) FROM (
                    SELECT s.*, p.full_name as owner_name, r.name as restaurant_name, p.phone_number as owner_phone
                    FROM public.subscriptions s
                    LEFT JOIN public.profiles p ON s.user_id = p.id
                    LEFT JOIN public.restaurants r ON s.restaurant_id = r.id
                    WHERE (r.name ILIKE search_term OR p.full_name ILIKE search_term OR p.phone_number ILIKE search_term)
                    ORDER BY s.created_at DESC 
                    LIMIT p_page_size OFFSET offset_val
                ) sub
            )
        ) INTO result;
        
    ELSIF p_scope = 'logs' THEN
        -- Standardized logs (we can expand this if we want separate counts for scans and claims)
        SELECT json_build_object(
            'stats', stats_data,
            'total_count', (
                SELECT count(*)::int FROM public.scans sc
                LEFT JOIN public.profiles p ON sc.user_id = p.id
                LEFT JOIN public.restaurants r ON sc.restaurant_id = r.id
                WHERE (p.full_name ILIKE search_term OR r.name ILIKE search_term OR p.phone_number ILIKE search_term)
            ),
            'recentScans', (
                SELECT COALESCE(json_agg(s), '[]'::json) FROM (
                    SELECT sc.*, p.full_name as user_name, p.phone_number as user_phone, r.name as restaurant_name
                    FROM public.scans sc
                    LEFT JOIN public.profiles p ON sc.user_id = p.id
                    LEFT JOIN public.restaurants r ON sc.restaurant_id = r.id
                    WHERE (p.full_name ILIKE search_term OR r.name ILIKE search_term OR p.phone_number ILIKE search_term)
                    ORDER BY sc.scanned_at DESC 
                    LIMIT p_page_size OFFSET offset_val
                ) s
            ),
            'recentClaims', (
                SELECT COALESCE(json_agg(c), '[]'::json) FROM (
                    SELECT cr.*, p.full_name as user_name, p.phone_number as user_phone, r.name as restaurant_name
                    FROM public.claimed_rewards cr
                    LEFT JOIN public.profiles p ON cr.user_id = p.id
                    LEFT JOIN public.restaurants r ON cr.restaurant_id = r.id
                    WHERE (p.full_name ILIKE search_term OR r.name ILIKE search_term)
                    ORDER BY cr.claimed_at DESC 
                    LIMIT 20 -- Keeps claims small since scans are the main bulk
                ) c
            )
        ) INTO result;
        
    ELSE
        SELECT json_build_object('stats', stats_data) INTO result;
    END IF;

    return result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicitly grant access
GRANT EXECUTE ON FUNCTION get_master_admin_stats_v4(UUID, TEXT, INT, INT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_master_admin_stats_v4(UUID, TEXT, INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_master_admin_stats_v4(UUID, TEXT, INT, INT, TEXT) TO service_role;
