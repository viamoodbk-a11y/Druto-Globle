
CREATE OR REPLACE FUNCTION get_master_admin_stats_v2(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Explicitly verify the provided user_id has the admin role
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_user_id
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: User % is not an admin', p_user_id;
    END IF;

    SELECT json_build_object(
        'stats', json_build_object(
            'totalUsers', (SELECT count(*) FROM profiles),
            'totalBusinesses', (SELECT count(*) FROM restaurants),
            'totalRewards', (SELECT count(*) FROM rewards WHERE is_active = true),
            'totalScans', (SELECT count(*) FROM scans),
            'totalClaimedRewards', (SELECT count(*) FROM claimed_rewards),
            'activeCards', (SELECT count(*) FROM loyalty_cards WHERE is_completed = false)
        ),
        'recentUsers', (
            SELECT json_agg(u) FROM (
                SELECT id, full_name, email, phone_number, created_at 
                FROM profiles 
                ORDER BY created_at DESC LIMIT 10
            ) u
        ),
        'recentBusinesses', (
            SELECT json_agg(rb) FROM (
                SELECT id, name, category, city, is_active, created_at 
                FROM restaurants 
                ORDER BY created_at DESC LIMIT 10
            ) rb
        ),
        'allUsers', (
            SELECT json_agg(u) FROM (
                SELECT p.id, p.full_name, p.email, p.phone_number, p.created_at, 
                       array_agg(ur.role) as roles
                FROM profiles p
                LEFT JOIN user_roles ur ON p.id = ur.user_id
                GROUP BY p.id
                ORDER BY p.created_at DESC LIMIT 1000
            ) u
        ),
        'allBusinesses', (
            SELECT json_agg(b) FROM (
                SELECT r.*, 
                       p.full_name as owner_name, 
                       p.phone_number as owner_phone,
                       (SELECT count(*) FROM scans s WHERE s.restaurant_id = r.id) as scan_count
                FROM restaurants r
                LEFT JOIN profiles p ON r.owner_id = p.id
                ORDER BY r.created_at DESC LIMIT 1000
            ) b
        ),
        'recentScans', (
            SELECT json_agg(s) FROM (
                SELECT sc.*, p.full_name as user_name, r.name as restaurant_name
                FROM scans sc
                LEFT JOIN profiles p ON sc.user_id = p.id
                LEFT JOIN restaurants r ON sc.restaurant_id = r.id
                ORDER BY sc.scanned_at DESC LIMIT 100
            ) s
        ),
        'recentClaims', (
            SELECT json_agg(c) FROM (
                SELECT cr.*, p.full_name as user_name, r.name as restaurant_name
                FROM claimed_rewards cr
                LEFT JOIN profiles p ON cr.user_id = p.id
                LEFT JOIN restaurants r ON cr.restaurant_id = r.id
                ORDER BY cr.claimed_at DESC LIMIT 100
            ) c
        ),
        'subscriptions', (
             SELECT json_agg(sub) FROM (
                SELECT s.*, p.full_name as owner_name, r.name as restaurant_name
                FROM subscriptions s
                LEFT JOIN profiles p ON s.user_id = p.id
                LEFT JOIN restaurants r ON s.restaurant_id = r.id
                ORDER BY s.created_at DESC LIMIT 1000
            ) sub
        )
    ) INTO result;

    return result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

