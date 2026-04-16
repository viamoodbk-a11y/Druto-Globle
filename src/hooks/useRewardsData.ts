import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedData, setCachedData } from "@/lib/queryCache";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";

const CACHE_KEY = "rewards_data";
const QUERY_KEY = ["rewards-data"];

interface AvailableReward {
  id: string;
  loyaltyCardId: string;
  restaurantId: string;
  rewardId: string;
  restaurantName: string;
  reward: string;
  icon: string;
  logoUrl: string | null;
  imageUrl?: string | null;
  description?: string | null;
  earnedAt: string;
  expiresIn: string;
  expiresAt: string | null;
  expiryDays?: number;
  isScratchCard?: boolean;
}

interface ClaimedReward {
  id: string;
  restaurant: string;
  reward: string;
  icon: string;
  imageUrl?: string | null;
  description?: string | null;
  claimedAt: string;
  isRedeemed: boolean;
  expiresAt: string | null;
}

interface ScratchCardWin {
  id: string;
  restaurantName: string;
  restaurantLogo: string | null;
  icon: string;
  rewardTitle: string;
  rewardDescription: string | null;
  rewardImageUrl: string | null;
  status: string;
  wonAt: string;
  claimedAt: string | null;
  acceptedAt: string | null;
}

interface RewardsPayload {
  availableRewards: AvailableReward[];
  claimedRewards: ClaimedReward[];
  scratchCardWins: ScratchCardWin[];
}

const fetchRewards = async (): Promise<RewardsPayload> => {
  const authData = localStorage.getItem("druto_auth");
  if (!authData) throw new Error("Not authenticated");

  const { userId } = JSON.parse(authData);

  const response = await fetch(
    `${SUPABASE_FUNCTIONS_URL}/get-rewards-data`,
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

  if (!response.ok) throw new Error(result?.error || "Failed to fetch rewards");
  if (!result?.success) throw new Error(result?.error || "Failed to fetch rewards");

  const payload: RewardsPayload = {
    availableRewards: result.availableRewards || [],
    claimedRewards: result.claimedRewards || [],
    scratchCardWins: result.scratchCardWins || [],
  };

  // Persist to localStorage
  setCachedData(CACHE_KEY, payload);
  return payload;
};

export const useRewardsData = () => {
  const queryClient = useQueryClient();

  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  const { data, isLoading, error } = useQuery<RewardsPayload>({
    queryKey: QUERY_KEY,
    queryFn: fetchRewards,
    initialData: () => getCachedData<RewardsPayload>(CACHE_KEY) ?? undefined,
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

  // Realtime subscriptions for claimed_rewards and scratch_card_results
  useEffect(() => {
    let userId: string | null = null;
    try {
      const authData = localStorage.getItem("druto_auth");
      if (authData) userId = JSON.parse(authData).userId;
    } catch { }
    if (!userId) return;

    const claimedChannel = supabase
      .channel("rewards-claimed-realtime")
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

    const scratchChannel = supabase
      .channel("rewards-scratch-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scratch_card_results",
          filter: `user_id=eq.${userId}`,
        },
        () => triggerRefetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(claimedChannel);
      supabase.removeChannel(scratchChannel);
    };
  }, [triggerRefetch]);

  return {
    availableRewards: data?.availableRewards ?? [],
    claimedRewards: data?.claimedRewards ?? [],
    scratchCardWins: data?.scratchCardWins ?? [],
    isLoading: isLoading && !data,
    error: error ? (error as Error).message : null,
    refetch: triggerRefetch,
  };
};