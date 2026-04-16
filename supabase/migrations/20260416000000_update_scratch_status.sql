-- Add 'redeeming' to scratch_card_results status
-- We need to drop the old constraint and add a new one
ALTER TABLE public.scratch_card_results 
DROP CONSTRAINT IF EXISTS scratch_card_results_status_check;

ALTER TABLE public.scratch_card_results 
ADD CONSTRAINT scratch_card_results_status_check 
CHECK (status IN ('pending', 'claimed', 'redeeming', 'accepted', 'declined'));
