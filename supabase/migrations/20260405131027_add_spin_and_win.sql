-- Spin & Win Data Models
-- Adds capability for restaurants to maintain customizable prize wheels.

CREATE TABLE IF NOT EXISTS public.spin_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    wedges JSONB NOT NULL DEFAULT '[]'::jsonb, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure a 1:1 restaurant mapping constraint
ALTER TABLE public.spin_configs ADD CONSTRAINT spin_configs_restaurant_id_key UNIQUE (restaurant_id);

CREATE TABLE IF NOT EXISTS public.user_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES public.scans(id) ON DELETE SET NULL, 
    won BOOLEAN NOT NULL DEFAULT false,
    prize_text TEXT,
    claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security and Triggers
ALTER TABLE public.spin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_spins ENABLE ROW LEVEL SECURITY;

-- Allow public fetching of spin config
CREATE POLICY "Allow public read access on spin_configs" 
ON public.spin_configs FOR SELECT USING (true);

-- Allow owner comprehensive management
CREATE POLICY "Allow owner update spin_configs" 
ON public.spin_configs FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Allow users to manage their spins natively 
CREATE POLICY "Allow users to read their own spins" 
ON public.user_spins FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow owner to view spins for their restaurant" 
ON public.user_spins FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

-- Note: user_spins insertions are strictly managed server-side by edge functions.
