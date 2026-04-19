import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useEffect } from "react";

export interface OwnerStats {
    totalScans: number;
    uniqueCustomers: number;
    rewardsRedeemed: number;
    todayScans: number;
    activeCards: number;
    completedCards: number;
    repeatRate: number;
    pendingScansCount: number;
}

export interface OwnerData {
    restaurant: any | null;
    rewards: any[];
    stats: OwnerStats;
    customers: any[];
    claimedRewards: any[];
    pendingScans: any[];
    branches: any[];
}

const DEFAULT_STATS: OwnerStats = {
    totalScans: 0,
    uniqueCustomers: 0,
    rewardsRedeemed: 0,
    todayScans: 0,
    activeCards: 0,
    completedCards: 0,
    repeatRate: 0,
    pendingScansCount: 0,
};

export const useOwnerData = () => {
    const queryClient = useQueryClient();
    const { data, isLoading, error, refetch } = useQuery<OwnerData>({
        queryKey: ['owner-dashboard'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) throw new Error("Not authenticated");

            const response = await fetch(
                `${SUPABASE_FUNCTIONS_URL}/get-owner-dashboard-data`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: ANON_KEY,
                        Authorization: `Bearer ${ANON_KEY}`,
                    },
                    body: JSON.stringify({ userId: user.id }),
                }
            );

            const result = await response.json();

            if (!result?.success) {
                throw new Error(result?.error || "Failed to load dashboard");
            }

            return {
                restaurant: result.restaurant,
                rewards: result.rewards || [],
                stats: result.stats || DEFAULT_STATS,
                customers: result.customers || [],
                claimedRewards: result.claimedRewards || [],
                pendingScans: result.pendingScans || [],
                branches: result.branches || [],
            };
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,  // 30 min — keep in memory across tab switches
    });

    useEffect(() => {
        const restaurantId = data?.restaurant?.id;
        if (!restaurantId) return;

        const scansChannel = supabase
            .channel(`owner-scans-${restaurantId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "scans", filter: `restaurant_id=eq.${restaurantId}` }, () => refetch())
            .subscribe();

        const claimedChannel = supabase
            .channel(`owner-claimed-${restaurantId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "claimed_rewards", filter: `restaurant_id=eq.${restaurantId}` }, () => refetch())
            .subscribe();

        const loyaltyChannel = supabase
            .channel(`owner-loyalty-${restaurantId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_cards", filter: `restaurant_id=eq.${restaurantId}` }, () => refetch())
            .subscribe();

        return () => {
            supabase.removeChannel(scansChannel);
            supabase.removeChannel(claimedChannel);
            supabase.removeChannel(loyaltyChannel);
        };
    }, [data?.restaurant?.id, refetch]);

    return {
        ...data,
        isLoading,
        error: error ? (error as Error).message : null,
        refetch,
    };
};
