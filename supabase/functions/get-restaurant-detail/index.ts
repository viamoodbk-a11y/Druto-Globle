import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getCorrectRewardTitle = (title: string | null, description: string | null): string => {
  const genericTitles = [
    "free reward of your choice",
    "special prize",
    "surprise reward",
    "new reward",
    "free reward",
    "reward",
    "scratch reward",
    "special reward"
  ];
  
  const lowerTitle = (title || "").toLowerCase().trim();
  
  if (!title || genericTitles.includes(lowerTitle) || lowerTitle.includes("choice") || lowerTitle.includes("special") || lowerTitle.includes("surprise")) {
    return description || title || "Reward";
  }
  
  return title;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantId, slug, userId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch restaurant by id or slug with split queries for maximum reliability
    let restaurantQuery = supabase
      .from("restaurants")
      .select(`
        id, name, slug, category, address, city, phone, website,
        is_active, logo_url, opening_hours, google_review_url,
        latitude, longitude, social_links
      `);

    if (slug) {
      // Use case-insensitive matching for slugs to prevent "Not Found" errors
      restaurantQuery = restaurantQuery.ilike("slug", slug);
    } else if (restaurantId) {
      restaurantQuery = restaurantQuery.eq("id", restaurantId);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Missing restaurantId or slug" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: restaurant, error: restaurantError } = await restaurantQuery.maybeSingle();

    if (restaurantError) {
      console.error("get-restaurant-detail: DB Error fetching restaurant", restaurantError);
      return new Response(
        JSON.stringify({ success: false, error: restaurantError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!restaurant) {
      console.log("get-restaurant-detail: Business not found for", { slug, restaurantId });
      return new Response(
        JSON.stringify({ success: false, error: "Business not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Now fetch active rewards separately (much more robust than joined filters)
    const { data: rewards, error: rewardsError } = await supabase
      .from("rewards")
      .select("id, name, description, stamps_required, reward_image_url, is_active, expiry_days")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("stamps_required", { ascending: true });

    if (rewardsError) {
      console.error("get-restaurant-detail: DB Error fetching rewards", rewardsError);
    }
    
    // Attach rewards to the restaurant object
    restaurant.rewards = (rewards || []).map((r: any) => ({
      ...r,
      name: getCorrectRewardTitle(r.name, r.description),
    }));

    let userVisits = 0;
    let visitHistory: { date: string; time: string }[] = [];
    let pendingScansCount = 0;
    let unredeemedRewardsList: any[] = [];
    let activeLoyaltyCardId: string | null = null;
    let pendingScratchCard: any = null;

    if (userId) {
      console.log(`get-restaurant-detail: Fetching user data for userId: ${userId} and restaurantId: ${restaurant.id}`);
      
      // Senior Dev Strategy: Wrap each sub-query in a safe handler so one failure doesn't crash the whole page
      const safeFetch = async (promise: Promise<any>, label: string) => {
        try {
          const result = await promise;
          if (result.error) {
            console.error(`get-restaurant-detail: [Sub-query Error] ${label}:`, result.error);
            return { data: null, error: result.error, count: 0 };
          }
          return result;
        } catch (e: any) {
          console.error(`get-restaurant-detail: [Exception] ${label}:`, e.message);
          return { data: null, error: e, count: 0 };
        }
      };

      // All user-specific queries run in parallel for high shell performance
      const [activeCardResult, scansResult, pendingResult, unredeemedRewardsResult, pendingScratchResult] = await Promise.all([
        safeFetch(
          supabase
            .from("loyalty_cards")
            .select("id, current_stamps, is_completed")
            .eq("user_id", userId)
            .eq("restaurant_id", restaurant.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          "activeCard"
        ),
        safeFetch(
          supabase
            .from("scans")
            .select("scanned_at")
            .eq("user_id", userId)
            .eq("restaurant_id", restaurant.id)
            .order("scanned_at", { ascending: false })
            .limit(10),
          "scansHistory"
        ),
        safeFetch(
          supabase
            .from("scans")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("restaurant_id", restaurant.id)
            .eq("staff_approved", false),
          "pendingScans"
        ),
        safeFetch(
          supabase
            .from("claimed_rewards")
            .select(`
              id,
              loyalty_card_id,
              reward_id,
              claimed_at,
              expires_at,
              reward:rewards (
                name,
                description,
                reward_image_url
              )
            `)
            .eq("user_id", userId)
            .eq("restaurant_id", restaurant.id)
            .eq("is_redeemed", false)
            .order("expires_at", { ascending: true }),
          "unredeemedRewards"
        ),
        safeFetch(
          supabase
            .from("scratch_card_results")
            .select("*")
            .eq("user_id", userId)
            .eq("restaurant_id", restaurant.id)
            .eq("status", "pending")
            .limit(1)
            .maybeSingle(),
          "pendingScratchCard"
        ),
      ]);

      const loyaltyCard = activeCardResult.data;
      const unredeemedRewards = unredeemedRewardsResult.data || [];
      unredeemedRewardsList = unredeemedRewards.map((ur: any) => ({
        ...ur,
        reward: ur.reward ? {
          ...ur.reward,
          name: getCorrectRewardTitle(ur.reward.name, ur.reward.description),
        } : null,
      }));
      activeLoyaltyCardId = loyaltyCard?.id || null;
      pendingScratchCard = pendingScratchResult?.data || null;

      if (loyaltyCard) {
        // Find the absolute maximum stamps required across all currently active rewards
        const currentMaxStamps = Math.max(...(restaurant.rewards || []).map((r: any) => r.stamps_required), 10);
        
        // RESCUE LOGIC: If a card was marked completed by the old logic (e.g. at 3 stamps) 
        // but the restaurant now has a higher milestone (e.g. 6 stamps), we treat it as active
        // so the user sees their "3 of 6" progress instead of a reset.
        const shouldBeActive = loyaltyCard.current_stamps < currentMaxStamps;

        if (loyaltyCard.is_completed && !shouldBeActive) {
          // If the latest card is truly COMPLETED, we only show full stamps if the reward for THIS card is NOT redeemed
          const rewardForThisCard = unredeemedRewards.find((r: any) => r.loyalty_card_id === loyaltyCard.id);
          if (rewardForThisCard) {
            userVisits = currentMaxStamps;
          } else {
            // Card completed and reward redeemed
            userVisits = 0;
          }
        } else {
          // Card still active OR rescued from premature completion
          userVisits = loyaltyCard.current_stamps || 0;
        }
      }

      pendingScansCount = pendingResult.count || 0;

      if (scansResult.data) {
        visitHistory = scansResult.data.map((scan: any) => {
          const date = new Date(scan.scanned_at);
          return {
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
          };
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: {
          ...restaurant,
          userVisits,
          visitHistory,
          pendingScans: pendingScansCount,
          unredeemedRewards: unredeemedRewardsList,
          activeLoyaltyCardId,
          pendingScratchCard,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
