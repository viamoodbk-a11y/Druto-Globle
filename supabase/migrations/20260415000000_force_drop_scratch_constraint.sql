DO $$ 
DECLARE 
    constraint_name_text text;
BEGIN
    SELECT constraint_name INTO constraint_name_text
    FROM information_schema.table_constraints 
    WHERE table_name = 'scratch_card_configs' AND constraint_type = 'UNIQUE';
    
    IF constraint_name_text IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.scratch_card_configs DROP CONSTRAINT ' || constraint_name_text;
    END IF;
END $$;

ALTER TABLE public.scratch_card_configs DROP CONSTRAINT IF EXISTS scratch_card_configs_restaurant_id_key;

DROP INDEX IF EXISTS scratch_card_configs_restaurant_id_key;
DROP INDEX IF EXISTS scratch_card_configs_restaurant_id_idx;
