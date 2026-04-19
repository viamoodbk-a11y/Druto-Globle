-- ============================================================
-- Dashboard Performance Boost Migration
-- Includes composite indexes and optimized aggregate functions
-- ============================================================

-- 1. Optimized Stats RPC
CREATE OR REPLACE FUNCTION get_owner_stats_v2(res_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    today_start TIMESTAMPTZ;
BEGIN
    -- Calculate today's start in IST (UTC+5:30)
    -- This matches the Edge Function logic: now() + 5.5 hours, truncate to day, subtract 5.5 hours
    today_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata')) AT TIME ZONE 'Asia/Kolkata';

    WITH stats AS (
        SELECT
            (SELECT count(*)::int FROM public.scans WHERE restaurant_id = res_id) as total_scans,
            (SELECT count(*)::int FROM public.scans WHERE restaurant_id = res_id AND scanned_at >= today_start) as today_scans,
            (SELECT count(*)::int FROM public.claimed_rewards WHERE restaurant_id = res_id AND is_redeemed = true) as rewards_redeemed,
            (SELECT count(*)::int FROM public.loyalty_cards WHERE restaurant_id = res_id) as unique_customers,
            (SELECT count(*)::int FROM public.loyalty_cards WHERE restaurant_id = res_id AND is_completed = false) as active_cards,
            (SELECT count(*)::int FROM public.loyalty_cards WHERE restaurant_id = res_id AND is_completed = true) as completed_cards,
            (SELECT count(*)::int FROM public.loyalty_cards WHERE restaurant_id = res_id AND (total_visits > 1 OR current_stamps > 1)) as repeat_customers,
            (SELECT count(*)::int FROM public.scans WHERE restaurant_id = res_id AND staff_approved = false) as pending_scans_count
    )
    SELECT row_to_json(s) INTO result FROM stats s;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Composite Indexes for scans
CREATE INDEX IF NOT EXISTS idx_scans_restaurant_staff_approved ON public.scans (restaurant_id, staff_approved) WHERE staff_approved = false;
CREATE INDEX IF NOT EXISTS idx_scans_restaurant_user_id ON public.scans (restaurant_id, user_id);

-- 3. Composite Indexes for loyalty_cards
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_restaurant_completed ON public.loyalty_cards (restaurant_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_repeat_logic ON public.loyalty_cards (restaurant_id) WHERE (total_visits > 1 OR current_stamps > 1);

-- 4. Composite Indexes for claimed_rewards
CREATE INDEX IF NOT EXISTS idx_claimed_rewards_restaurant_redeemed ON public.claimed_rewards (restaurant_id, is_redeemed);

-- 5. History optimization
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_restaurant_date ON public.notification_campaigns (restaurant_id, created_at DESC);

-- 6. Optimized Customer Data RPC
CREATE OR REPLACE FUNCTION get_customer_data_v3(c_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    WITH cards AS (
        SELECT 
            lc.id,
            lc.current_stamps,
            lc.total_visits,
            lc.is_completed,
            lc.reward_id,
            lc.restaurant_id,
            lc.created_at,
            lc.updated_at,
            json_build_object(
                'id', r.id,
                'name', r.name,
                'slug', r.slug,
                'logo_url', r.logo_url,
                'category', r.category
            ) as restaurants,
            (
                SELECT row_to_json(rw_inner)
                FROM (
                    SELECT rw.id, rw.restaurant_id, rw.name, rw.description, rw.stamps_required, rw.reward_image_url, rw.is_active, rw.created_at
                    FROM public.rewards rw
                    WHERE rw.restaurant_id = lc.restaurant_id AND rw.is_active = true
                    ORDER BY rw.created_at DESC
                    LIMIT 1
                ) rw_inner
            ) as reward
        FROM public.loyalty_cards lc
        JOIN public.restaurants r ON r.id = lc.restaurant_id
        WHERE lc.user_id = c_user_id
        ORDER BY lc.updated_at DESC, lc.created_at DESC
        LIMIT 10
    ),
    profile_data AS (
        SELECT full_name, phone_number
        FROM public.profiles
        WHERE id = c_user_id
        LIMIT 1
    )
    SELECT json_build_object(
        'success', true,
        'profile', (SELECT row_to_json(p) FROM profile_data p),
        'loyaltyCards', COALESCE((SELECT json_agg(c) FROM cards c), '[]'::json),
        'totalVisits', (SELECT count(*)::int FROM public.scans WHERE user_id = c_user_id),
        'rewardsEarned', (SELECT count(*)::int FROM public.claimed_rewards WHERE user_id = c_user_id)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
