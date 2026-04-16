import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCachedData, setCachedData, clearCachedData } from "@/lib/queryCache";
import { toast } from "sonner";
import { useCallback, useEffect, useRef } from "react";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";

interface CustomerScan {
  id: string;
  phone: string;
  name: string;
  totalVisits: number;
  stampsRequired: number;
  lastVisit: string;
  scans: {
    id: string;
    time: string;
    visitNumber: number;
    locationVerified: boolean;
  }[];
}

interface ClaimedReward {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  rewardId: string;
  rewardName: string;
  rewardDescription: string | null;
  rewardImageUrl: string | null;
  stampsRequired: number;
  claimedAt: string;
  expiresAt: string | null;
  isRedeemed: boolean;
  redeemedAt: string | null;
  isExpired: boolean;
}

interface PendingScan {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  scannedAt: string;
  locationVerified: boolean;
}

interface OwnerStats {
  totalScans: number;
  uniqueCustomers: number;
  rewardsRedeemed: number;
  todayScans: number;
  activeCards: number;
  completedCards: number;
  repeatRate: number;
  pendingScansCount: number;
}

interface Restaurant {
  id: string;
  name: string;
  logoUrl: string | null;
  category: string | null;
  googleReviewUrl: string | null;
  openingHours: any | null;
  socialLinks?: { instagram?: string; facebook?: string; youtube?: string } | null;
}

interface Reward {
  id: string;
  name: string;
  description: string | null;
  stampsRequired: number;
  expiryDays: number | null;
  rewardImageUrl: string | null;
}

interface SubscriptionInfo {
  isActive: boolean;
  isTrialing: boolean;
  status: string;
  planTier: string;
  trialEnd: string | null;
  trialDaysLeft: number | null;
}

interface ScratchCardConfig {
  id?: string;
  isEnabled: boolean;
  oddsNumerator: number;
  oddsDenominator: number;
  rewardTitle: string;
  rewardDescription: string | null;
  rewardImageUrl: string | null;
}

interface ScratchCardReward {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  rewardTitle: string;
  rewardDescription: string | null;
  rewardImageUrl: string | null;
  status: string;
  claimedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

interface OwnerData {
  restaurant: Restaurant | null;
  rewards: Reward[];
  stats: OwnerStats;
  customers: CustomerScan[];
  claimedRewards: ClaimedReward[];
  pendingScans: PendingScan[];
  subscription?: SubscriptionInfo;
  scratchCardConfigs?: ScratchCardConfig[];
  scratchCardRewards?: ScratchCardReward[];
  isLoading: boolean;
  error: string | null;
}

export type { ClaimedReward, PendingScan, ScratchCardConfig, ScratchCardReward };

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

const CACHE_KEY = "owner_dashboard_data";
const QUERY_KEY = ["owner-dashboard"];

export const useOwnerData = () => {
  const queryClient = useQueryClient();
  const restaurantIdRef = useRef<string | null>(null);

  const { data: queryData, isLoading, error, refetch } = useQuery<OwnerData>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) throw new Error("Not authenticated");

      let userId;
      try {
        userId = JSON.parse(authData).userId;
      } catch (e) {
        throw new Error("Invalid authentication data");
      }

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/get-owner-dashboard-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({ userId, timestamp: Date.now() }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result?.success) {
        const errorMsg = result?.error || "Failed to load dashboard";
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (result.restaurant?.id) {
        restaurantIdRef.current = result.restaurant.id;
      }

      const processedRewards = (result.rewards || []).map((r: any) => {
        let textDescription = r.description || "Free reward";
        let iconMatch = textDescription.match(/\[icon:(.+?)\]/);
        let icon = r.icon || '🎁';
        
        if (iconMatch) {
          icon = iconMatch[1];
          textDescription = textDescription.replace(/\[icon:.*?\]/g, '');
        }
        return { ...r, description: textDescription, icon };
      });

      const newData: OwnerData = {
        restaurant: result.restaurant,
        rewards: processedRewards,
        stats: result.stats || DEFAULT_STATS,
        customers: result.customers || [],
        claimedRewards: result.claimedRewards || [],
        pendingScans: result.pendingScans || [],
        subscription: result.subscription,
        scratchCardConfigs: result.scratchCardConfigs || [],
        scratchCardRewards: result.scratchCardRewards || [],
        isLoading: false,
        error: null,
      };

      setCachedData(CACHE_KEY, newData);
      return newData;
    },
    initialData: () => {
      try {
        return getCachedData<OwnerData>(CACHE_KEY) ?? undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: () => {
      try {
        const cached = localStorage.getItem(`druto_cache_${CACHE_KEY}`);
        if (cached) return JSON.parse(cached).timestamp;
      } catch { }
      return undefined;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes — realtime subscriptions handle immediate updates
    refetchOnWindowFocus: false, // Realtime handles updates; no need for focus refetch
    refetchOnReconnect: true,
  });

  const clearCache = useCallback(() => {
    clearCachedData(CACHE_KEY);
  }, []);

  // Setup realtime subscriptions
  useEffect(() => {
    let scansChannel: any = null;
    let claimedChannel: any = null;
    let loyaltyChannel: any = null;

    const setupRealtime = () => {
      const restaurantId = restaurantIdRef.current || queryData?.restaurant?.id;
      if (!restaurantId) return;

      scansChannel = supabase
        .channel(`owner-scans-${restaurantId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "scans", filter: `restaurant_id=eq.${restaurantId}` }, () => refetch())
        .subscribe();

      claimedChannel = supabase
        .channel(`owner-claimed-${restaurantId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "claimed_rewards", filter: `restaurant_id=eq.${restaurantId}` }, () => refetch())
        .subscribe();

      loyaltyChannel = supabase
        .channel(`owner-loyalty-${restaurantId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_cards", filter: `restaurant_id=eq.${restaurantId}` }, () => refetch())
        .subscribe();

      const scratchChannel = supabase
        .channel(`owner-scratch-${restaurantId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "scratch_card_results", filter: `restaurant_id=eq.${restaurantId}` }, () => refetch())
        .subscribe();
      
      return scratchChannel;
    };

    const timeout = setTimeout(() => {
      const channel = setupRealtime();
      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (scansChannel) supabase.removeChannel(scansChannel);
      if (claimedChannel) supabase.removeChannel(claimedChannel);
      if (loyaltyChannel) supabase.removeChannel(loyaltyChannel);
    };
  }, [queryData?.restaurant?.id, refetch]);

  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEY,
      queryFn: async () => {
        const authData = localStorage.getItem("druto_auth");
        if (!authData) return;
        let userId;
        try {
          userId = JSON.parse(authData).userId;
        } catch (e) {
          return;
        }
        const response = await fetch(
          `${SUPABASE_FUNCTIONS_URL}/get-owner-dashboard-data`,
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
        if (result.success) {
          const processedRewards = (result.rewards || []).map((r: any) => {
            let textDescription = r.description || "Free reward";
            let iconMatch = textDescription.match(/\[icon:(.+?)\]/);
            let icon = r.icon || '🎁';
            
            if (iconMatch) {
              icon = iconMatch[1];
              textDescription = textDescription.replace(/\[icon:.*?\]/g, '');
            }
            return { ...r, description: textDescription, icon };
          });

          const newData = {
            restaurant: result.restaurant,
            rewards: processedRewards,
            stats: result.stats || DEFAULT_STATS,
            customers: result.customers || [],
            claimedRewards: result.claimedRewards || [],
            pendingScans: result.pendingScans || [],
            subscription: result.subscription,
            scratchCardConfigs: result.scratchCardConfigs || [],
            scratchCardRewards: result.scratchCardRewards || [],
            isLoading: false,
            error: null,
          };
          setCachedData(CACHE_KEY, newData);
          return newData;
        }
      }
    });
  }, [queryClient]);

  return {
    restaurant: queryData?.restaurant || null,
    rewards: queryData?.rewards || [],
    stats: queryData?.stats || DEFAULT_STATS,
    customers: queryData?.customers || [],
    claimedRewards: queryData?.claimedRewards || [],
    pendingScans: queryData?.pendingScans || [],
    subscription: queryData?.subscription,
    scratchCardConfigs: queryData?.scratchCardConfigs || [],
    scratchCardRewards: queryData?.scratchCardRewards || [],
    isLoading: isLoading && !queryData,
    error: error ? (error as Error).message : null,
    refetch,
    prefetch,
    clearCache,
  };
};
