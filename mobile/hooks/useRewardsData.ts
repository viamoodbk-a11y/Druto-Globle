import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getCachedData, setCachedData } from "../lib/queryCache";

const CACHE_KEY = "rewards_data";
const QUERY_KEY = ["rewards-data"];

export interface AvailableReward {
    id: string;
    loyaltyCardId: string;
    restaurantId: string;
    rewardId: string;
    restaurantName: string;
    reward: string;
    icon: string;
    logoUrl: string | null;
    imageUrl: string | null;
    earnedAt: string;
    expiresIn: string;
    expiresAt: string | null;
}

export interface ClaimedReward {
    id: string;
    reward: string;
    restaurant: string;
    icon: string;
    claimedAt: string;
    isRedeemed: boolean;
    expiresAt: string | null;
}

export interface RewardsPayload {
    availableRewards: AvailableReward[];
    claimedRewards: ClaimedReward[];
}

const fetchRewards = async (): Promise<RewardsPayload> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Not authenticated");

    const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/get-rewards-data`,
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
        throw new Error(result?.error || "Failed to load rewards");
    }

    const available: AvailableReward[] = (result.availableRewards || []).map((r: any) => ({
        id: r.id,
        loyaltyCardId: r.loyaltyCardId || "",
        restaurantId: r.restaurantId || "",
        rewardId: r.rewardId || "",
        restaurantName: r.restaurantName || "Restaurant",
        reward: r.reward || "Reward",
        icon: r.icon || "🎁",
        logoUrl: r.logoUrl || null,
        imageUrl: r.imageUrl || null,
        earnedAt: r.earnedAt || "",
        expiresIn: r.expiresIn || "No expiry",
        expiresAt: r.expiresAt || null,
    }));

    const claimed: ClaimedReward[] = (result.claimedRewards || []).map((r: any) => ({
        id: r.id,
        reward: r.reward || "Reward",
        restaurant: r.restaurant || "Restaurant",
        icon: r.icon || "🎁",
        claimedAt: r.claimedAt || "",
        isRedeemed: r.isRedeemed ?? true,
        expiresAt: r.expiresAt || null,
    }));

    const payload: RewardsPayload = {
        availableRewards: available,
        claimedRewards: claimed,
    };

    setCachedData(CACHE_KEY, payload);
    return payload;
};

export const useRewardsData = () => {
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery<RewardsPayload>({
        queryKey: QUERY_KEY,
        queryFn: fetchRewards,
        initialData: () => getCachedData<RewardsPayload>(CACHE_KEY),
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,   // 30 min — keep in memory across tab switches
        retry: 2,
    });

    const refetch = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    };

    return {
        availableRewards: data?.availableRewards || [],
        claimedRewards: data?.claimedRewards || [],
        isLoading,
        refetch,
        error: error ? (error as Error).message : null,
    };
};
