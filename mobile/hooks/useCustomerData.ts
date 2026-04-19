import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getCachedData, setCachedData } from "../lib/queryCache";

const CACHE_KEY = "customer_data";
const QUERY_KEY = ["customer-data"];

export interface LoyaltyCard {
    id: string;
    restaurantName: string;
    restaurantId: string;
    restaurantSlug: string | null;
    restaurantLogoUrl: string | null;
    rewardDescription: string;
    rewardImageUrl: string | null;
    rewardItem: string;
    current: number;
    total: number;
    streak: number;
    isCompleted: boolean;
    rewardId: string | null;
}

export interface CustomerPayload {
    loyaltyCards: LoyaltyCard[];
    totalVisits: number;
    rewardsEarned: number;
    profile: {
        fullName: string | null;
        phone: string | null;
    } | null;
}

const categoryEmoji: Record<string, string> = {
    cafe: "☕",
    bakery: "🥐",
    restaurant: "🍽️",
    pizza: "🍕",
    chinese: "🥟",
    indian: "🍛",
    default: "🎁",
};

const fetchCustomerData = async (): Promise<CustomerPayload> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Not authenticated");

    const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/get-customer-data`,
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

    if (!result.success) {
        throw new Error(result.error || "Failed to fetch customer data");
    }

    const mappedCards: LoyaltyCard[] = (result.loyaltyCards || []).map((card: any) => {
        const restaurant = card.restaurants;
        const reward = card.reward;
        return {
            id: card.id,
            restaurantName: restaurant?.name || "Unknown Restaurant",
            restaurantId: card.restaurant_id,
            restaurantSlug: restaurant?.slug || null,
            restaurantLogoUrl: restaurant?.logo_url || null,
            rewardDescription: reward?.description || reward?.name || "Free reward",
            rewardImageUrl: reward?.reward_image_url || null,
            rewardItem: categoryEmoji[restaurant?.category?.toLowerCase()] || categoryEmoji.default,
            current: card.current_stamps || 0,
            total: reward?.stamps_required || 10,
            streak: Math.min(card.total_visits || 0, 7),
            isCompleted: card.is_completed || false,
            rewardId: card.reward_id || reward?.id || null,
        };
    });

    const profile = result.profile;
    const payload: CustomerPayload = {
        loyaltyCards: mappedCards,
        totalVisits: result.totalVisits || 0,
        rewardsEarned: result.rewardsEarned || 0,
        profile: {
            fullName: profile?.full_name || null,
            phone: profile?.phone_number || null,
        },
    };

    setCachedData(CACHE_KEY, payload);
    return payload;
};

export const useCustomerData = () => {
    const queryClient = useQueryClient();

    const triggerRefetch = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    }, [queryClient]);

    const { data, isLoading, error } = useQuery<CustomerPayload>({
        queryKey: QUERY_KEY,
        queryFn: fetchCustomerData,
        initialData: () => getCachedData<CustomerPayload>(CACHE_KEY),
        staleTime: 1000 * 60 * 5,   // 5 min — don't refetch if fresh
        gcTime: 1000 * 60 * 30,    // 30 min — keep in memory across tab switches
    });

    useEffect(() => {
        let authSubscription: any;

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;

            const loyaltyChannel = supabase
                .channel(`customer-loyalty-${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "loyalty_cards",
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => triggerRefetch()
                )
                .subscribe();

            authSubscription = loyaltyChannel;
        });

        return () => {
            if (authSubscription) supabase.removeChannel(authSubscription);
        };
    }, [triggerRefetch]);

    const DEFAULT_PAYLOAD: CustomerPayload = {
        loyaltyCards: [],
        totalVisits: 0,
        rewardsEarned: 0,
        profile: null,
    };

    return {
        ...(data ?? DEFAULT_PAYLOAD),
        isLoading: isLoading && !data,
        error: error ? (error as Error).message : null,
        refetch: triggerRefetch,
    };
};
