import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedData, setCachedData } from "@/lib/queryCache";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";

const CACHE_KEY = "customer_data";
const QUERY_KEY = ["customer-data"];

interface RewardMilestone {
  id: string;
  name: string;
  description: string;
  stampsRequired: number;
}

interface LoyaltyCard {
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
  allRewards?: RewardMilestone[];
}

interface CustomerPayload {
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
  restaurant: "🍽️",
  bakery: "🥐",
  bar: "🍺",
  pizza: "🍕",
  chinese: "🥟",
  indian: "🍛",
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
  default: "🎁",
};

const fetchCustomerData = async (): Promise<CustomerPayload> => {
  const authDataRaw = localStorage.getItem("druto_auth");
  if (!authDataRaw) throw new Error("Not authenticated");

  let authData: { userId: string; profile?: any };
  try {
    authData = JSON.parse(authDataRaw);
  } catch {
    throw new Error("Malformed auth data");
  }

  const { userId, profile: storedProfile } = authData;

  const response = await fetch(
    `${SUPABASE_FUNCTIONS_URL}/get-customer-data`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ userId }),
    }
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch customer data");
  }

  const mappedCards: LoyaltyCard[] = (result.loyaltyCards || []).map((card: any) => {
    const restaurant = card.restaurants;
    const reward = card.reward;
    const allRewardsMapped = (card.all_rewards || []).map((rw: any) => ({
      id: rw.id,
      name: rw.name,
      description: rw.description,
      stampsRequired: rw.stamps_required
    })).sort((a: any, b: any) => a.stampsRequired - b.stampsRequired);

    const maxStamps = allRewardsMapped.length > 0 
      ? Math.max(...allRewardsMapped.map((r: any) => r.stampsRequired)) 
      : (reward?.stamps_required || 10);

    return {
      id: card.id,
      restaurantName: restaurant?.name || "Unknown Restaurant",
      restaurantId: card.restaurant_id,
      restaurantSlug: restaurant?.slug || null,
      restaurantLogoUrl: restaurant?.logo_url || null,
      rewardDescription: reward?.description || reward?.name || "Free reward",
      rewardImageUrl: reward?.reward_image_url || null,
      rewardItem:
        categoryEmoji[restaurant?.category?.toLowerCase()] || categoryEmoji.default,
      current: card.current_stamps || 0,
      total: maxStamps,
      streak: Math.min(card.total_visits || 0, 7),
      isCompleted: card.is_completed || false,
      rewardId: card.reward_id || reward?.id || null,
      allRewards: allRewardsMapped,
    };
  });

  const profile = result.profile;
  const payload: CustomerPayload = {
    loyaltyCards: mappedCards,
    totalVisits: result.totalVisits || 0,
    rewardsEarned: result.rewardsEarned || 0,
    profile: {
      fullName: profile?.full_name || storedProfile?.full_name || null,
      phone: profile?.phone_number || storedProfile?.phone_number || null,
    },
  };

  // Persist to localStorage
  setCachedData(CACHE_KEY, payload);

  // OPTIMIZATION: Pre-populate profile cache to make Profile page instant
  // Map what we have - even if partial, it eliminates the blank skeleton
  try {
    const profile = result.profile;
    const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
    const memberSince = createdAt.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const profileCacheData = {
      id: userId,
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone_number || "",
      avatarUrl: profile?.avatar_url || null,
      memberSince,
      totalVisits: result.totalVisits || 0,
      rewardsEarned: result.rewardsEarned || 0,
      level: Math.floor((result.totalVisits || 0) / 10) + 1,
    };
    setCachedData("profile_data", profileCacheData);
  } catch (e) {
    console.warn("Failed to pre-populate profile cache:", e);
  }

  return payload;
};

export const useCustomerData = () => {
  const queryClient = useQueryClient();
  const userIdRef = useRef<string | null>(null);

  // Stable refetch helper used by realtime subscriptions
  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const { data, isLoading, error } = useQuery<CustomerPayload>({
    queryKey: QUERY_KEY,
    queryFn: fetchCustomerData,
    initialData: () => getCachedData<CustomerPayload>(CACHE_KEY) ?? undefined,
    initialDataUpdatedAt: () => {
      try {
        const cached = localStorage.getItem(`druto_cache_${CACHE_KEY}`);
        if (cached) return JSON.parse(cached).timestamp;
      } catch { }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });

  // Setup realtime subscriptions (not replaced by TanStack Query)
  useEffect(() => {
    try {
      const authDataRaw = localStorage.getItem("druto_auth");
      if (authDataRaw) {
        const { userId } = JSON.parse(authDataRaw);
        userIdRef.current = userId;
      }
    } catch { }

    const userId = userIdRef.current;
    if (!userId) return;

    const loyaltyChannel = supabase
      .channel("customer-loyalty-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "loyalty_cards",
          filter: `user_id=eq.${userId}`,
        },
        () => triggerRefetch()
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "loyalty_cards",
          filter: `user_id=eq.${userId}`,
        },
        () => triggerRefetch()
      )
      .subscribe();

    const claimedChannel = supabase
      .channel("customer-claimed-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "claimed_rewards",
          filter: `user_id=eq.${userId}`,
        },
        () => triggerRefetch()
      )
      .subscribe();

    const scansChannel = supabase
      .channel("customer-scans-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scans",
          filter: `user_id=eq.${userId}`,
        },
        () => triggerRefetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(loyaltyChannel);
      supabase.removeChannel(claimedChannel);
      supabase.removeChannel(scansChannel);
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
