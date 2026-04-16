import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

const QUERY_KEY = ["explore-restaurants"];

export interface RestaurantBrief {
    id: string;
    name: string;
    slug: string | null;
    logoUrl: string | null;
    category: string;
    address: string | null;
    reward: string;
    stampsRequired: number;
    isActive: boolean;
    icon: string;
}

const categoryEmoji: Record<string, string> = {
    cafe: "☕",
    restaurant: "🍽️",
    bakery: "🥐",
    bar: "🍺",
    ice_cream: "🍦",
    salon: "💇",
    gym: "🏋️",
    car_wash: "🚗",
    jewelry: "💎",
    pet_store: "🐾",
    bookstore: "📚",
    clothing: "👗",
    electronics: "📱",
    pharmacy: "💊",
    grocery: "🛒",
    retail: "🛍️",
    other: "📦",
};

const getCategoryIcon = (category: string): string =>
    categoryEmoji[category?.toLowerCase()] ?? "🏪";

const fetchRestaurants = async (): Promise<RestaurantBrief[]> => {
    const { data: restaurants, error } = await supabase
        .from("restaurants")
        .select(`
            id,
            name,
            slug,
            category,
            address,
            is_active,
            logo_url,
            rewards (
                name,
                stamps_required
            )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Explore fetch error:", error);
        throw error;
    }

    return (restaurants || []).map((r: any) => {
        const reward = r.rewards?.[0];
        return {
            id: r.id,
            name: r.name,
            slug: r.slug,
            category: r.category || "cafe",
            icon: getCategoryIcon(r.category || "cafe"),
            reward: reward
                ? `${reward.name} after ${reward.stamps_required} visits`
                : "Loyalty reward",
            stampsRequired: reward?.stamps_required || 10,
            address: r.address,
            isActive: r.is_active,
            logoUrl: r.logo_url || null,
        };
    });
};

export const useExploreData = () => {
    const { data, isLoading, refetch, error } = useQuery<RestaurantBrief[]>({
        queryKey: QUERY_KEY,
        queryFn: fetchRestaurants,
        staleTime: 1000 * 60 * 10,  // 10 min — restaurant list rarely changes
        gcTime: 1000 * 60 * 60,    // 60 min — keep in memory much longer; restaurants very stable
        retry: 2,
    });

    return {
        restaurants: data || [],
        isLoading,
        refetch,
        error: error ? (error as Error).message : null,
    };
};
