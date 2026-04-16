-- ============================================================
-- Production Performance Indexes
-- New composite indexes that plug gaps in earlier migrations.
-- ============================================================

-- Speeds up the "already scanned today" check in process-scan
-- (previous idx_scans_user_restaurant didn't include scanned_at)
CREATE INDEX IF NOT EXISTS idx_scans_uid_rid_date
  ON public.scans (user_id, restaurant_id, scanned_at DESC);

-- Speeds up loyalty_cards lookup by user+restaurant sorted by creation
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_uid_rid_created
  ON public.loyalty_cards (user_id, restaurant_id, created_at DESC);

-- Speeds up claimed_rewards lookup in the restaurant detail page
CREATE INDEX IF NOT EXISTS idx_claimed_rewards_card_id
  ON public.claimed_rewards (loyalty_card_id);

-- Speeds up is_active filter on restaurants (used in explore page)
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active
  ON public.restaurants (is_active)
  WHERE is_active = true;

-- Speeds up is_active filter on rewards
CREATE INDEX IF NOT EXISTS idx_rewards_restaurant_active
  ON public.rewards (restaurant_id, is_active)
  WHERE is_active = true;
