-- Drop the UNIQUE constraint on restaurant_id to allow multiple scratch cards
ALTER TABLE public.scratch_card_configs
    DROP CONSTRAINT IF EXISTS scratch_card_configs_restaurant_id_key;
