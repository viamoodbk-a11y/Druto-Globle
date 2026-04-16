import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedData, setCachedData } from "@/lib/queryCache";

const CACHE_KEY = "explore_restaurants";
const QUERY_KEY = ["explore-restaurants"];

interface Restaurant {
  id: string;
  name: string;
  slug: string | null;
  category: string;
  icon: string;
  reward: string;
  stampsRequired: number;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  logoUrl: string | null;
}

export type { Restaurant };

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
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
  return icons[category] || "🏪";
};

const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select(`
      id,
      name,
      slug,
      category,
      address,
      phone,
      is_active,
      logo_url,
      rewards (
        name,
        stamps_required
      )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) throw error;

  const formatted: Restaurant[] = (restaurants || []).map((r: any) => {
    const reward = r.rewards?.[0];
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      category: r.category || "other",
      icon: getCategoryIcon(r.category || "other"),
      reward: reward ? `${reward.name} after ${reward.stamps_required} visits` : "Loyalty reward",
      stampsRequired: reward?.stamps_required || 10,
      address: r.address,
      phone: r.phone,
      isActive: r.is_active,
      logoUrl: r.logo_url || null,
    };
  });

  // Persist to localStorage for instant rehydration
  setCachedData(CACHE_KEY, formatted);
  return formatted;
};

export const useExploreData = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<Restaurant[]>({
    queryKey: QUERY_KEY,
    queryFn: fetchRestaurants,
    initialData: () => getCachedData<Restaurant[]>(CACHE_KEY) ?? undefined,
    initialDataUpdatedAt: () => {
      try {
        const cached = localStorage.getItem(`druto_cache_${CACHE_KEY}`);
        if (cached) return JSON.parse(cached).timestamp;
      } catch {}
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  return {
    restaurants: data ?? [],
    isLoading: isLoading && !data,
    isRefetching: !!data && isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
};
