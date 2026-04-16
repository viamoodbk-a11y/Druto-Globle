-- Create RPC to get scan counts per restaurant for Admin Dashboard Analysis
CREATE OR REPLACE FUNCTION get_all_business_stats()
RETURNS TABLE (
    restaurant_id UUID,
    scan_counts BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.restaurant_id, count(*)::BIGINT
    FROM public.scans s
    GROUP BY s.restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
