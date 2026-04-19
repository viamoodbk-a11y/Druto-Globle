-- ============================================================
-- Performance Indexes Migration
-- These indexes speed up the most frequently queried columns
-- across all Edge Functions. They are safe and non-breaking.
-- ============================================================

-- scans table: filtered by user_id, restaurant_id, scanned_at
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans (user_id);
CREATE INDEX IF NOT EXISTS idx_scans_restaurant_id ON scans (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_restaurant ON scans (user_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans (scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_restaurant_scanned_at ON scans (restaurant_id, scanned_at DESC);

-- loyalty_cards table: filtered by user_id, restaurant_id
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_user_id ON loyalty_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_restaurant_id ON loyalty_cards (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_user_restaurant ON loyalty_cards (user_id, restaurant_id);

-- claimed_rewards table: filtered by user_id, restaurant_id
CREATE INDEX IF NOT EXISTS idx_claimed_rewards_user_id ON claimed_rewards (user_id);
CREATE INDEX IF NOT EXISTS idx_claimed_rewards_restaurant_id ON claimed_rewards (restaurant_id);

-- rewards table: filtered by restaurant_id
CREATE INDEX IF NOT EXISTS idx_rewards_restaurant_id ON rewards (restaurant_id);

-- restaurants table: looked up by slug and owner_id
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants (slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants (owner_id);

-- branches table: filtered by restaurant_id
CREATE INDEX IF NOT EXISTS idx_branches_restaurant_id ON branches (restaurant_id);

-- push_tokens table: filtered by user_id (for notifications)
-- CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens (user_id);
