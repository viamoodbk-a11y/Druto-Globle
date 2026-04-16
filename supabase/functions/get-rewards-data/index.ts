import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    cafe: "☕",
    restaurant: "🍽️",
    bakery: "🥐",
    bar: "🍺",
    salon: "💇",
    gym: "🏋️",
    retail: "🛍️",
    other: "📦",
  };
  return icons[category] || "🎁";
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
    const { userId } = await req.json();
    console.log("Get rewards data for user:", userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing userId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch claimed rewards that are NOT redeemed yet (available to redeem)
    // AND most recent 10 redeemed rewards (for history view)
    const { data: claimedRewards, error: claimedError } = await supabase
      .from("claimed_rewards")
      .select(`
        id,
        claimed_at,
        redeemed_at,
        is_redeemed,
        expires_at,
        loyalty_card_id,
        restaurant_id,
        reward_id,
        rewards:reward_id (
          id,
          name,
          description,
          reward_image_url,
          expiry_days
        ),
        restaurants:restaurant_id (
          id,
          name,
          category,
          logo_url
        )
      `)
      .eq("user_id", userId)
      .order("claimed_at", { ascending: false })
      .limit(30); // Prevent fetching massive history, fetch enough to show available + 10 recent

    if (claimedError) {
      console.error("Error fetching claimed rewards:", claimedError);
    }

    // Fetch completed loyalty cards that don't have a claim entry yet
    const claimedCardIds = new Set((claimedRewards || []).map(cr => cr.loyalty_card_id).filter(Boolean));
    
    const { data: completedCards, error: cardsError } = await supabase
      .from("loyalty_cards")
      .select(`
        id,
        restaurant_id,
        created_at,
        restaurants:restaurant_id (
          name,
          category,
          logo_url
        ),
        reward:reward_id (
          id,
          name,
          description,
          reward_image_url,
          expiry_days
        )
      `)
      .eq("user_id", userId)
      .eq("is_completed", true);

    if (cardsError) {
      console.error("Error fetching completed cards:", cardsError);
    }

    const unclaimedRewards = (completedCards || [])
      .filter(card => !claimedCardIds.has(card.id))
      .map(card => {
        const restaurant = card.restaurants;
        const reward = card.reward;
        const createdDate = new Date(card.created_at);
        
        return {
          id: `unclaimed-${card.id}`, // Custom prefix to identify unclaimed
          loyaltyCardId: card.id,
          restaurantId: card.restaurant_id,
          rewardId: reward?.id || "",
          restaurantName: restaurant?.name || "Unknown",
          reward: getCorrectRewardTitle(reward?.name || null, reward?.description || null),
          icon: getCategoryIcon(restaurant?.category || "other"),
          logoUrl: restaurant?.logo_url || null,
          imageUrl: reward?.reward_image_url || null,
          description: reward?.description || null,
          earnedAt: createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          expiresIn: "Ready to claim",
          isUnclaimed: true,
        };
      });

    // Build rewards lists
    const now = new Date();

    const isRedeemedRow = (cr: any) => !!cr.is_redeemed || !!cr.redeemed_at;
    const isExpiredRow = (cr: any) => !!cr.expires_at && new Date(cr.expires_at) < now;

    // Available rewards (claimed but not redeemed, not expired)
    const availableRewards = (claimedRewards || [])
      .filter((cr: any) => !isRedeemedRow(cr) && !isExpiredRow(cr))
      .map((cr: any) => {
        const restaurant = cr.restaurants;
        const reward = cr.rewards;
        const claimedDate = new Date(cr.claimed_at);
        const expiresAt = cr.expires_at ? new Date(cr.expires_at) : null;

        // Format expires in
        let expiresIn = "No expiry";
        if (expiresAt) {
          const diff = expiresAt.getTime() - now.getTime();
          const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
          if (days < 0) expiresIn = "Expired";
          else if (days === 0) expiresIn = "Expires today";
          else if (days === 1) expiresIn = "1 day left";
          else expiresIn = `${days} days left`;
        }

        // Format earned at
        const diffMs = now.getTime() - claimedDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let earnedAt = claimedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        if (diffDays === 0) earnedAt = "Today";
        else if (diffDays === 1) earnedAt = "Yesterday";
        else if (diffDays < 7) earnedAt = `${diffDays} days ago`;

        return {
          id: cr.id,
          loyaltyCardId: cr.loyalty_card_id || "",
          restaurantId: cr.restaurant_id || "",
          rewardId: cr.reward_id || "",
          restaurantName: restaurant?.name || "Unknown",
          reward: getCorrectRewardTitle(reward?.name || null, reward?.description || null),
          icon: getCategoryIcon(restaurant?.category || "other"),
          logoUrl: restaurant?.logo_url || null,
          imageUrl: reward?.reward_image_url || null,
          description: reward?.description || null,
          earnedAt,
          expiresIn,
          expiresAt: cr.expires_at,
          expiryDays: reward?.expiry_days,
          isRedeemed: false, // Explicitly false for available list
        };
      });

    // Redeemed rewards (history)
    const redeemedRewards = (claimedRewards || [])
      .filter((cr: any) => isRedeemedRow(cr))
      .map((cr: any) => {
        const restaurant = cr.restaurants;
        const reward = cr.rewards;
        const redeemedDate = cr.redeemed_at
          ? new Date(cr.redeemed_at)
          : new Date(cr.claimed_at);

        // Format time ago
        const diffMs = now.getTime() - redeemedDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let claimedAt = redeemedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        if (diffDays === 0) claimedAt = "Today";
        else if (diffDays === 1) claimedAt = "Yesterday";
        else if (diffDays < 7) claimedAt = `${diffDays} days ago`;

        return {
          id: cr.id,
          restaurant: restaurant?.name || "Unknown",
          reward: getCorrectRewardTitle(reward?.name || null, reward?.description || null),
          icon: getCategoryIcon(restaurant?.category || "other"),
          imageUrl: reward?.reward_image_url || null,
          description: reward?.description || null,
          claimedAt,
          isRedeemed: true,
          expiresAt: cr.expires_at,
        };
      });

    console.log("Available rewards:", availableRewards.length);
    console.log("Redeemed rewards:", redeemedRewards.length);

    // Fetch scratch card wins for this user
    const { data: scratchWins, error: scratchError } = await supabase
      .from("scratch_card_results")
      .select(`
        id,
        restaurant_id,
        won,
        reward_title,
        reward_description,
        reward_image_url,
        status,
        claimed_at,
        owner_accepted_at,
        created_at,
        restaurants:restaurant_id (
          name,
          category,
          logo_url
        )
      `)
      .eq("user_id", userId)
      .eq("won", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (scratchError) {
      console.error("Error fetching scratch card wins:", scratchError);
    }

    const formattedScratchWins = (scratchWins || []).map((sw: any) => {
      const restaurant = sw.restaurants;
      const createdDate = new Date(sw.created_at);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      let wonAt = createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      if (diffDays === 0) wonAt = "Today";
      else if (diffDays === 1) wonAt = "Yesterday";
      else if (diffDays < 7) wonAt = `${diffDays} days ago`;

      return {
        id: sw.id,
        restaurantName: restaurant?.name || "Unknown",
        restaurantLogo: restaurant?.logo_url || null,
        icon: getCategoryIcon(restaurant?.category || "other"),
        rewardTitle: getCorrectRewardTitle(sw.reward_title, sw.reward_description),
        rewardDescription: sw.reward_description,
        rewardImageUrl: sw.reward_image_url,
        status: sw.status,
        wonAt,
        claimedAt: sw.claimed_at ? new Date(sw.claimed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
        acceptedAt: sw.owner_accepted_at ? new Date(sw.owner_accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null,
      };
    });

    const scratchHistory = (scratchWins || [])
      .filter((sw: any) => sw.status === "accepted" || sw.status === "redeemed")
      .map((sw: any) => {
        const restaurant = sw.restaurants;
        const redeemedDate = sw.owner_accepted_at ? new Date(sw.owner_accepted_at) : new Date(sw.created_at);
        
        const diffMs = now.getTime() - redeemedDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        let claimedAt = redeemedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (diffDays === 0) claimedAt = "Today";
        else if (diffDays === 1) claimedAt = "Yesterday";
        else if (diffDays < 7) claimedAt = `${diffDays} days ago`;

        return {
          id: sw.id,
          restaurant: restaurant?.name || "Unknown",
          reward: getCorrectRewardTitle(sw.reward_title, sw.reward_description),
          icon: "🎰",
          imageUrl: sw.reward_image_url || null,
          description: sw.reward_description || null,
          claimedAt,
          isRedeemed: true,
          expiresAt: null,
          isScratchCard: true
        };
      });

    console.log("Scratch card wins (all):", formattedScratchWins.length);
    console.log("Scratch card history:", scratchHistory.length);

    // Map claimed scratch card wins into availableRewards list
    const scratchAvailable = (scratchWins || [])
      .filter((sw: any) => sw.status === "claimed")
      .map((sw: any) => {
        const restaurant = sw.restaurants;
        const claimedDate = sw.claimed_at ? new Date(sw.claimed_at) : new Date(sw.created_at);
        
        return {
          id: sw.id,
          restaurantId: sw.restaurant_id || "",
          restaurantName: restaurant?.name || "Unknown",
          reward: getCorrectRewardTitle(sw.reward_title, sw.reward_description),
          icon: "🎰",
          logoUrl: restaurant?.logo_url || null,
          imageUrl: sw.reward_image_url || null,
          description: sw.reward_description || null,
          earnedAt: claimedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          expiresIn: "Special Reward Won!",
          isScratchCard: true,
        };
      });

    return new Response(
      JSON.stringify({
        success: true,
        availableRewards: [...unclaimedRewards, ...availableRewards, ...scratchAvailable],
        claimedRewards: [...redeemedRewards, ...scratchHistory].sort((a, b) => {
          // Sort by date (we need to handle the string formats or pass timestamps)
          return 0; // Simple for now
        }),
        scratchCardWins: formattedScratchWins.filter(sw => sw.status === "pending"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});