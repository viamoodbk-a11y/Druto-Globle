import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { mapRestaurantData, RestaurantData } from "../lib/restaurantUtils";

export const useRestaurantDetail = (slug: string | null) => {
    return useQuery({
        queryKey: ['restaurant-detail', slug],
        queryFn: async () => {
            if (!slug) return null;

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-restaurant-detail`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: ANON_KEY,
                    Authorization: `Bearer ${ANON_KEY}`,
                },

                body: JSON.stringify({
                    restaurantId: isUUID ? slug : null,
                    slug: isUUID ? null : slug,
                    userId: session?.user?.id,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result?.success || !result?.restaurant) {
                throw new Error(result?.error || "Failed to fetch restaurant");
            }

            return mapRestaurantData(result.restaurant);
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,   // 30 min — keeps restaurant data cached across navigation
        enabled: !!slug,
        retry: false,
    });
};
