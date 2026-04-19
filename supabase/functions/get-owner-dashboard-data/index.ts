import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type OpeningHours = { open: string; close: string };

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
    const { userId, statsOnly } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Restaurant (owner)
    const { data: restaurants, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, logo_url, category, google_review_url, opening_hours, social_links")
      .eq("owner_id", userId)
      .limit(1);

    if (restaurantError) {
      console.error("get-owner-dashboard-data: restaurantError", restaurantError);
      return new Response(JSON.stringify({ success: false, error: "Failed to fetch restaurant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restaurant = restaurants?.[0] ?? null;
    if (!restaurant) {
      return new Response(
        JSON.stringify({
          success: true,
          restaurant: null,
          rewards: [],
          stats: { totalScans: 0, uniqueCustomers: 0, rewardsRedeemed: 0, todayScans: 0, activeCards: 0, completedCards: 0, repeatRate: 0, pendingScansCount: 0 },
          customers: [],
          claimedRewards: [],
          pendingScans: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restaurantId = restaurant.id as string;
    const now = new Date();
    // Start of day in IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const today = new Date(now.getTime() + istOffset);
    today.setUTCHours(0, 0, 0, 0);
    // Convert back to UTC to compare with DB timestamps
    const todayInIstAsUtc = new Date(today.getTime() - istOffset);
    const todayIso = todayInIstAsUtc.toISOString();

    const [
      statsResult,
      rewardsResult,
      claimedResult,
      cardsResult,
      scansResult,
      branchesResult,
      subscriptionResult,
      scratchConfigResult,
      scratchWinsResult,
    ] = statsOnly ? [
      await supabaseAdmin.rpc("get_owner_stats_v2", { res_id: restaurantId }),
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: null },
      { data: null },
      { data: [] },
    ] : await Promise.all([
      supabaseAdmin.rpc("get_owner_stats_v2", { res_id: restaurantId }),
      supabaseAdmin.from("rewards").select("id, name, description, stamps_required, expiry_days, reward_image_url").eq("restaurant_id", restaurantId).eq("is_active", true).order("created_at", { ascending: false }),
      supabaseAdmin.from("claimed_rewards").select("id, user_id, reward_id, claimed_at, expires_at, is_redeemed, redeemed_at").eq("restaurant_id", restaurantId).order("claimed_at", { ascending: false }).limit(50),
      supabaseAdmin.from("loyalty_cards").select("id, user_id, current_stamps, is_completed, total_visits, reward_id").eq("restaurant_id", restaurantId),
      supabaseAdmin.from("scans").select("id, scanned_at, location_verified, user_id, staff_approved, branch_id").eq("restaurant_id", restaurantId).order("scanned_at", { ascending: false }).limit(50),
      supabaseAdmin.from("branches").select("id, name, latitude, longitude, is_active").eq("restaurant_id", restaurantId),
      supabaseAdmin.from("subscriptions").select("status, trial_end, plan_tier, razorpay_plan_id, admin_override").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("scratch_card_configs").select("id, is_enabled, odds_numerator, odds_denominator, reward_title, reward_description, reward_image_url").eq("restaurant_id", restaurantId).order("created_at", { ascending: true }),
      supabaseAdmin.from("scratch_card_results").select("id, user_id, won, reward_title, reward_description, reward_image_url, status, claimed_at, owner_accepted_at, created_at").eq("restaurant_id", restaurantId).eq("won", true).order("created_at", { ascending: false }).limit(50),
    ]);

    const stats = statsResult.data || { total_scans: 0, unique_customers: 0, rewards_redeemed: 0, today_scans: 0, active_cards: 0, completed_cards: 0, repeat_customers: 0, pending_scans_count: 0 };
    const rewards = rewardsResult.data || [];
    const claimedRewards = claimedResult.data || [];
    const loyaltyCards = cardsResult.data || [];
    const scans = scansResult.data || [];
    const branches = branchesResult.data || [];
    const subscription = subscriptionResult.data;
    const scratchConfigs = scratchConfigResult.data || [];
    const scratchWins = scratchWinsResult.data || [];

    const pendingScans = scans.filter((s: any) => s.staff_approved === false);

    const branchMap = new Map<string, string>();
    branches.forEach((b: any) => branchMap.set(b.id, b.name));

    // === PARALLEL BATCH 2: Fetch all needed profiles at once ===
    const scanUserIds = new Set(scans.map((s: any) => s.user_id));
    const claimedUserIds = new Set(claimedRewards.map((cr: any) => cr.user_id));
    const allUserIds = [...new Set([...scanUserIds, ...claimedUserIds])];

    const profileMap = new Map<string, any>();
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone_number")
        .in("id", allUserIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
    }

    // Loyalty cards per user
    const cardByUser = new Map<string, any>();
    loyaltyCards.forEach((c: any) => cardByUser.set(c.user_id, c));

    const activeReward = rewards[0];
    const defaultStampsRequired = activeReward?.stamps_required || 10;

    // Format helpers
    const formatTimeAgo = (date: Date): string => {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", year: "numeric" }).format(date);
    };

    const formatDateTime = (date: Date): string => {
      const istFormatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const dateOverrider = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
        day: "numeric",
      });

      const time = istFormatter.format(date);

      // Reliable way to check Today/Yesterday in a specific timezone
      const getIstDateString = (d: Date) => {
        return new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d); // Outputs YYYY-MM-DD
      };

      const istNowStr = getIstDateString(new Date());
      const istDateStr = getIstDateString(date);

      if (istNowStr === istDateStr) return `Today, ${time}`;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (getIstDateString(yesterday) === istDateStr) return `Yesterday, ${time}`;

      return `${dateOverrider.format(date)}, ${time}`;
    };

    // Group scans by customer
    const customerMap = new Map<string, any>();
    scans.forEach((scan: any) => {
      const profile = profileMap.get(scan.user_id);
      const loyaltyCard = cardByUser.get(scan.user_id);
      if (!customerMap.has(scan.user_id)) {
        customerMap.set(scan.user_id, {
          id: scan.user_id,
          phone: profile?.phone_number || "Unknown",
          name: profile?.full_name || "Customer",
          totalVisits: loyaltyCard?.current_stamps || 0,
          stampsRequired: defaultStampsRequired,
          lastVisit: formatTimeAgo(new Date(scan.scanned_at)),
          scans: [],
        });
      }
      const customer = customerMap.get(scan.user_id);
      customer.scans.push({
        id: scan.id,
        time: formatDateTime(new Date(scan.scanned_at)),
        visitNumber: customer.scans.length + 1,
        locationVerified: scan.location_verified || false,
        branchName: scan.branch_id ? branchMap.get(scan.branch_id) || null : null,
      });
    });

    const customers = Array.from(customerMap.values());

    // Format claimed rewards
    const formattedClaimedRewards = claimedRewards.map((cr: any) => {
      const profile = profileMap.get(cr.user_id);
      const reward = rewards.find((r: any) => r.id === cr.reward_id);
      const isExpired = cr.expires_at && new Date(cr.expires_at) < new Date();
      return {
        id: cr.id,
        customerId: cr.user_id,
        customerName: profile?.full_name || "Customer",
        customerPhone: profile?.phone_number || "Unknown",
        rewardId: cr.reward_id,
        rewardName: getCorrectRewardTitle(reward?.name || null, reward?.description || null),
        rewardDescription: reward?.description || null,
        rewardImageUrl: reward?.reward_image_url || null,
        stampsRequired: reward?.stamps_required || 0,
        claimedAt: formatDateTime(new Date(cr.claimed_at)),
        expiresAt: cr.expires_at,
        isRedeemed: cr.is_redeemed || false,
        redeemedAt: cr.redeemed_at ? formatDateTime(new Date(cr.redeemed_at)) : null,
        isExpired,
      };
    });

    // Format pending scans
    const formattedPendingScans = pendingScans.slice(0, 50).map((scan: any) => {
      const profile = profileMap.get(scan.user_id);
      return {
        id: scan.id,
        customerId: scan.user_id,
        customerName: profile?.full_name || "Customer",
        customerPhone: profile?.phone_number || "Unknown",
        scannedAt: formatDateTime(new Date(scan.scanned_at)),
        locationVerified: scan.location_verified || false,
      };
    });

    // Format scratch card wins for owner
    const scratchWinUserIds = new Set(scratchWins.map((sw: any) => sw.user_id));
    const allScratchUserIds = [...scratchWinUserIds].filter(id => !profileMap.has(id));
    if (allScratchUserIds.length > 0) {
      const { data: scratchProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone_number")
        .in("id", allScratchUserIds);
      (scratchProfiles || []).forEach((p: any) => profileMap.set(p.id, p));
    }

    const formattedScratchWins = scratchWins.map((sw: any) => {
      const profile = profileMap.get(sw.user_id);
      return {
        id: sw.id,
        customerId: sw.user_id,
        customerName: profile?.full_name || "Customer",
        customerPhone: profile?.phone_number || "Unknown",
        rewardTitle: getCorrectRewardTitle(sw.reward_title, sw.reward_description),
        rewardDescription: sw.reward_description,
        rewardImageUrl: sw.reward_image_url,
        status: sw.status,
        claimedAt: sw.claimed_at ? formatDateTime(new Date(sw.claimed_at)) : null,
        acceptedAt: sw.owner_accepted_at ? formatDateTime(new Date(sw.owner_accepted_at)) : null,
        createdAt: formatDateTime(new Date(sw.created_at)),
      };
    });

    // Final Response
    return new Response(
      JSON.stringify({
        success: true,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          logoUrl: restaurant.logo_url,
          category: restaurant.category,
          googleReviewUrl: restaurant.google_review_url,
          openingHours: (restaurant.opening_hours || null) as OpeningHours | null,
          socialLinks: restaurant.social_links || null,
        },
        rewards: rewards.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          stampsRequired: r.stamps_required,
          expiryDays: r.expiry_days,
          rewardImageUrl: r.reward_image_url,
        })),
        stats: {
          totalScans: stats.total_scans,
          uniqueCustomers: stats.unique_customers,
          rewardsRedeemed: stats.rewards_redeemed,
          todayScans: stats.today_scans,
          activeCards: stats.active_cards,
          completedCards: stats.completed_cards,
          repeatRate: stats.unique_customers > 0 ? Math.round((stats.repeat_customers / stats.unique_customers) * 100) : 0,
          pendingScansCount: stats.pending_scans_count,
        },
        customers,
        claimedRewards: formattedClaimedRewards,
        pendingScans: formattedPendingScans,
        branches,
        scratchCardConfig: scratchConfigs.length > 0 ? {
          id: scratchConfigs[0].id,
          isEnabled: scratchConfigs[0].is_enabled,
          oddsNumerator: scratchConfigs[0].odds_numerator,
          oddsDenominator: scratchConfigs[0].odds_denominator,
          rewardTitle: scratchConfigs[0].reward_title,
          rewardDescription: scratchConfigs[0].reward_description,
          rewardImageUrl: scratchConfigs[0].reward_image_url,
        } : null,
        scratchCardConfigs: scratchConfigs.map((c: any) => ({
          id: c.id,
          isEnabled: c.is_enabled,
          oddsNumerator: c.odds_numerator,
          oddsDenominator: c.odds_denominator,
          rewardTitle: c.reward_title,
          rewardDescription: c.reward_description,
          rewardImageUrl: c.reward_image_url,
        })),
        scratchCardRewards: formattedScratchWins,
        subscription: subscription ? {
          isActive: subscription.status === "active" || 
                   (subscription.status === "trialing" && subscription.trial_end && new Date(subscription.trial_end) > new Date()) || 
                   !!subscription.admin_override,
          isTrialing: subscription.status === "trialing" && subscription.trial_end && new Date(subscription.trial_end) > new Date(),
          status: subscription.admin_override ? "Admin Access" : subscription.status,
          planTier: subscription.plan_tier || "starter",
          trialEnd: subscription.trial_end,
          trialDaysLeft: subscription.trial_end 
            ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null,
        } : {
          isActive: false,
          isTrialing: false,
          status: "none",
          planTier: "starter",
          trialEnd: null,
          trialDaysLeft: null
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("get-owner-dashboard-data error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
