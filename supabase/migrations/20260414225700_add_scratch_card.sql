-- Scratch Card Feature
-- Adds scratch card mini-game that owners can enable per restaurant.
-- Customers scratch a card after scanning to potentially win a bonus reward.

-- 1. Configuration table — one per restaurant
CREATE TABLE IF NOT EXISTS public.scratch_card_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    odds_numerator INTEGER NOT NULL DEFAULT 1,    -- e.g. 1 out of 10
    odds_denominator INTEGER NOT NULL DEFAULT 10,
    reward_title TEXT NOT NULL DEFAULT 'Special Prize',
    reward_description TEXT,
    reward_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure 1:1 restaurant mapping
ALTER TABLE public.scratch_card_configs
    ADD CONSTRAINT scratch_card_configs_restaurant_id_key UNIQUE (restaurant_id);

-- 2. Results table — one per scan attempt (when scratch card is enabled)
CREATE TABLE IF NOT EXISTS public.scratch_card_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL,
    won BOOLEAN NOT NULL DEFAULT false,
    reward_title TEXT,
    reward_description TEXT,
    reward_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'accepted', 'declined')),
    claimed_at TIMESTAMP WITH TIME ZONE,
    owner_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_scratch_card_results_user ON public.scratch_card_results(user_id);
CREATE INDEX idx_scratch_card_results_restaurant ON public.scratch_card_results(restaurant_id);
CREATE INDEX idx_scratch_card_results_won ON public.scratch_card_results(restaurant_id, won) WHERE won = true;

-- Row Level Security
ALTER TABLE public.scratch_card_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_card_results ENABLE ROW LEVEL SECURITY;

-- Configs: public read, owner full access
CREATE POLICY "Allow public read access on scratch_card_configs"
    ON public.scratch_card_configs FOR SELECT USING (true);

CREATE POLICY "Allow owner manage scratch_card_configs"
    ON public.scratch_card_configs FOR ALL USING (
        restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    );

-- Results: users read their own, owners read for their restaurant
CREATE POLICY "Allow users to read their own scratch_card_results"
    ON public.scratch_card_results FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow owner to view scratch results for their restaurant"
    ON public.scratch_card_results FOR SELECT USING (
        restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    );

CREATE POLICY "Allow owner to update scratch results for their restaurant"
    ON public.scratch_card_results FOR UPDATE USING (
        restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
    );

-- Note: scratch_card_results insertions are managed server-side by edge functions.
