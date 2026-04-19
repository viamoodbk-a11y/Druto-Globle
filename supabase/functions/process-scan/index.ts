import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Haversine formula to calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, restaurantId, locationVerified, staffApproved, requestPendingApproval, userLatitude, userLongitude, maxDistanceMeters } = body;
    console.log("Process scan request:", { userId, restaurantId, locationVerified, staffApproved, requestPendingApproval, userLatitude, userLongitude });

    if (!userId || !restaurantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing userId or restaurantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(restaurantId);

    // === STEP 1: Fetch restaurant FIRST to ensure we have the UUID (id) ===
    // This is critical because rewards and loyalty_cards use UUIDs, but restaurantId might be a slug
    const restaurantQuery = isUUID
      ? supabaseAdmin.from("restaurants").select("id, name, slug, latitude, longitude, owner_id, social_links, require_approval").eq("is_active", true).eq("id", restaurantId).maybeSingle()
      : supabaseAdmin.from("restaurants").select("id, name, slug, latitude, longitude, owner_id, social_links, require_approval").eq("is_active", true).eq("slug", restaurantId).maybeSingle();

    const { data: restaurant, error: restaurantError } = await restaurantQuery;

    if (restaurantError || !restaurant) {
      console.error("Restaurant not found:", restaurantError);
      return new Response(
        JSON.stringify({ success: false, error: "Restaurant not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Now use the GUARANTEED UUID (restaurant.id) for all subsequent queries
    const realRestaurantId = restaurant.id;

    // Start of day for duplicate scan check in IST (India Standard Time)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayInIst = new Date(now.getTime() + istOffset);
    todayInIst.setUTCHours(0, 0, 0, 0);
    
    // Convert back to UTC for DB queries to match storage format
    const istMidnightUtc = new Date(todayInIst.getTime() - istOffset);
    const todayIso = istMidnightUtc.toISOString();

    // === STEP 2: Run remaining queries using the UUID ===
    const [rewardResult, existingCardsResult, existingScansResult, subscriptionResult, profileResult] = await Promise.all([
      supabaseAdmin.from("rewards").select("id, name, description, stamps_required, expiry_days, reward_image_url").eq("restaurant_id", realRestaurantId).eq("is_active", true).order("stamps_required", { ascending: true }),
      supabaseAdmin.from("loyalty_cards").select("id, current_stamps, is_completed, reward_id, total_visits").eq("user_id", userId).eq("restaurant_id", realRestaurantId).order("created_at", { ascending: false }),
      supabaseAdmin.from("scans").select("id, staff_approved").eq("user_id", userId).eq("restaurant_id", realRestaurantId).gte("scanned_at", todayIso).order("scanned_at", { ascending: false }).limit(1),
      supabaseAdmin.rpc("check_subscription_access", { owner_user_id: restaurant.owner_id }),
      supabaseAdmin.from("profiles").select("phone").eq("id", userId).maybeSingle()
    ]);

    const userPhone = profileResult.data?.phone;
    const isTestAccount = userPhone === '920961840';

    // Check for existing scan today
    if (existingScansResult.data && existingScansResult.data.length > 0 && !isTestAccount) {
      const existingScan = existingScansResult.data[0];
      
      // If the scan exists but isn't approved, and they are requesting pending, just return it
      if (requestPendingApproval && existingScan.staff_approved === false) {
        console.log("Returning existing pending scan for retry:", existingScan.id);
        const currentStamps = loyaltyCard?.current_stamps || 0;
        return new Response(
          JSON.stringify({
            success: true,
            pendingApproval: true,
            currentStamps,
            totalStamps: stampsRequired,
            restaurantName: restaurant.name,
            restaurantSlug: restaurant.slug,
            restaurantId: realRestaurantId,
            message: "Scan recorded! Waiting for staff approval to add your stamp.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          alreadyScannedToday: true,
          error: "Already scanned today",
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          restaurantId: realRestaurantId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rewards = rewardResult.data || [];
    // maxStampsRequired is the highest reward milestone
    const maxStampsRequired = rewards.length > 0 ? Math.max(...rewards.map(r => r.stamps_required)) : 10;
    const stampsRequired = maxStampsRequired;
    const expiryDays = rewards[0]?.expiry_days || 30;

    // Check owner subscription
    if (!subscriptionResult.data) {
      console.log("Owner subscription expired for restaurant:", restaurant.name);
      return new Response(
        JSON.stringify({
          success: false,
          loyaltyPaused: true,
          restaurantName: restaurant.name,
          error: "This restaurant's loyalty program is currently paused. Please check back later!",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DETERMINE SCAN APPROVAL MODE ===
    const socialLinks = typeof restaurant.social_links === 'object' ? restaurant.social_links as Record<string, any> : {};
    const allowRemoteScan = socialLinks?.allow_remote_scan === true;
    const requireApproval = restaurant.require_approval === true;

    let isAutoApproved = false;
    let matchedBranchId: string | null = null;
    let matchedBranchName: string | null = null;
    let locationCheckPassed = false;

    if (requestPendingApproval) {
      isAutoApproved = false;
    } else if (staffApproved) {
      isAutoApproved = true;
    } else if (!userLatitude || !userLongitude) {
      if (allowRemoteScan) {
        console.log("No location provided, but allowRemoteScan is ON, creating pending scan");
        isAutoApproved = false;
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            tooFarFromRestaurant: true,
            allowRemoteScan: false,
            distance: null,
            maxDistance: 50,
            restaurantName: restaurant.name,
            restaurantId: restaurant.id,
            error: "Location access is required to scan. Please enable GPS and allow location access.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const maxDistance = maxDistanceMeters || 200;

      const { data: branches } = await supabaseAdmin
        .from("branches")
        .select("id, name, latitude, longitude")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true);

      const locations: Array<{ id: string | null; name: string; lat: number; lng: number }> = [];

      if (restaurant.latitude && restaurant.longitude) {
        locations.push({ id: null, name: restaurant.name, lat: restaurant.latitude, lng: restaurant.longitude });
      }

      if (branches) {
        for (const branch of branches) {
          if (branch.latitude && branch.longitude) {
            locations.push({ id: branch.id, name: branch.name, lat: branch.latitude, lng: branch.longitude });
          }
        }
      }

      let closestDistance = Infinity;
      let closestLocation: typeof locations[0] | null = null;

      for (const loc of locations) {
        const distance = calculateDistance(userLatitude, userLongitude, loc.lat, loc.lng);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestLocation = loc;
        }
      }

      console.log(`Closest location: ${closestLocation?.name} at ${closestDistance.toFixed(2)}m (max: ${maxDistance}m)`);

      if (closestLocation && closestDistance <= maxDistance) {
        // Here we apply the new override: if requireApproval is ON, autoapprove is false.
        isAutoApproved = !requireApproval;
        locationCheckPassed = true;
        matchedBranchId = closestLocation.id;
        matchedBranchName = closestLocation.name;
        
        if (requireApproval) {
          console.log("Location verified, but require_approval is ON. Making scan pending.");
        }
      } else {

        if (allowRemoteScan) {
          console.log("User is far but allowRemoteScan is ON, creating pending scan");
          isAutoApproved = false;
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              tooFarFromRestaurant: true,
              allowRemoteScan: false,
              distance: Math.round(closestDistance),
              maxDistance,
              restaurantName: restaurant.name,
              restaurantId: restaurant.id,
              error: `You are ${Math.round(closestDistance)}m away. Please move closer to the restaurant.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // === Handle loyalty card (from parallel fetch) ===
    let loyaltyCard = existingCardsResult.data?.[0] || null;

    // Handle completed cards/new cycles
    if (loyaltyCard && loyaltyCard.is_completed) {
      // SMART FIX: If the card is completed, but we now have higher rewards available, 
      // do NOT reset to 0. Instead, "un-complete" it and let the user continue.
      if (loyaltyCard.current_stamps < maxStampsRequired) {
        console.log("Un-completing card to allow reaching NEW milestones:", loyaltyCard.id);
        const { data: reopenedCard, error: reopenError } = await supabaseAdmin
          .from("loyalty_cards")
          .update({
             is_completed: false,
             completed_at: null,
             updated_at: new Date().toISOString()
          })
          .eq("id", loyaltyCard.id)
          .select()
          .single();
        
        if (!reopenError) {
          loyaltyCard = reopenedCard;
        }
      } else {
        // Truly finished all cycles, so reset for a fresh start
        console.log("Found completed card, resetting for NEXT reward cycle:", loyaltyCard.id);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        const { data: updatedCard, error: cardError } = await supabaseAdmin
          .from("loyalty_cards")
          .update({
            reward_id: rewards[0]?.id || loyaltyCard.reward_id,
            current_stamps: 0,
            is_completed: false,
            completed_at: null,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", loyaltyCard.id)
          .select()
          .single();

        if (cardError) {
          console.error("Error resetting loyalty card cycle:", cardError);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to start new loyalty cycle", details: cardError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        loyaltyCard = updatedCard;
      }
    }

    // Create new card if none exists
    if (!loyaltyCard) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const { data: newCard, error: cardError } = await supabaseAdmin
        .from("loyalty_cards")
        .insert({
          user_id: userId,
          restaurant_id: restaurant.id,
          reward_id: rewards[0]?.id || null,
          current_stamps: 0,
          total_visits: 0,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (cardError) {
        console.error("Error creating loyalty card:", cardError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create loyalty card", details: cardError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      loyaltyCard = newCard;
    }

    if (!loyaltyCard) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to get or create loyalty card" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the scan
    const scanInsert: Record<string, any> = {
      user_id: userId,
      restaurant_id: restaurant.id,
      loyalty_card_id: loyaltyCard.id,
      location_verified: locationCheckPassed,
      staff_approved: isAutoApproved,
    };
    if (matchedBranchId) {
      scanInsert.branch_id = matchedBranchId;
    }

    const { data: newScan, error: scanError } = await supabaseAdmin
      .from("scans")
      .insert(scanInsert)
      .select("id")
      .single();

    if (scanError) {
      console.error("Error recording scan:", scanError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record scan", details: scanError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If auto-approved, add the stamp immediately
    if (isAutoApproved) {
      const newStamps = (loyaltyCard.current_stamps || 0) + 1;
      
      // Determine if a reward was reached AT THIS STEP
      const reachedReward = rewards.find(r => r.stamps_required === newStamps);
      
      // Card is only completed when it reaches the HIGHEST milestone
      const isCompleted = newStamps >= maxStampsRequired;

      const updateData: Record<string, any> = {
        current_stamps: newStamps,
        total_visits: (loyaltyCard.total_visits || 0) + 1,
        updated_at: new Date().toISOString(),
      };

      if (isCompleted) {
        updateData.is_completed = true;
        updateData.completed_at = new Date().toISOString();
      }

      const { error: cardUpdateError } = await supabaseAdmin
        .from("loyalty_cards")
        .update(updateData)
        .eq("id", loyaltyCard.id);

      if (cardUpdateError) {
        console.error("Error updating loyalty card:", cardUpdateError);
      }

      // If a reward was reached (even if it's not the final one), claim it
      if (reachedReward) {
        const rewardExpiryDays = reachedReward.expiry_days || 7;
        const rewardExpiresAt = new Date();
        rewardExpiresAt.setDate(rewardExpiresAt.getDate() + rewardExpiryDays);

        await supabaseAdmin.from("claimed_rewards").insert({
          user_id: userId,
          restaurant_id: restaurant.id,
          reward_id: reachedReward.id,
          loyalty_card_id: loyaltyCard.id,
          expires_at: rewardExpiresAt.toISOString(),
        });

        console.log(`Milestone reward reached (${newStamps} stamps) for user:`, userId);
      }

      // === SCRATCH CARD LOGIC ===
      let scratchCardData: any = null;
      try {
        const { data: scratchConfigs } = await supabaseAdmin
          .from("scratch_card_configs")
          .select("id, is_enabled, odds_numerator, odds_denominator, reward_title, reward_description, reward_image_url")
          .eq("restaurant_id", restaurant.id)
          .eq("is_enabled", true);

        if (scratchConfigs && scratchConfigs.length > 0) {
          // New "True Random" Strategy:
          // Check EACH enabled config against its own odds.
          // This allows for multiple different prizes to be won at their own set frequency.
          const winningPrizes = scratchConfigs.filter(config => {
            const odds = (config.odds_numerator || 1) / (config.odds_denominator || 10);
            return Math.random() < odds;
          });

          const won = winningPrizes.length > 0;
          // If they won multiple (unlikely but possible), pick one winner at random from the pool
          const selectedPrize = won 
            ? winningPrizes[Math.floor(Math.random() * winningPrizes.length)] 
            : null;

          const scratchInsert: Record<string, any> = {
            user_id: userId,
            restaurant_id: restaurant.id,
            scan_id: newScan?.id || null,
            won,
            status: "pending",
          };

          if (won && selectedPrize) {
            scratchInsert.reward_title = selectedPrize.reward_title;
            scratchInsert.reward_description = selectedPrize.reward_description;
            scratchInsert.reward_image_url = selectedPrize.reward_image_url;
          }

          const { data: scratchResult, error: scratchError } = await supabaseAdmin
            .from("scratch_card_results")
            .insert(scratchInsert)
            .select("id")
            .single();

          if (!scratchError && scratchResult) {
            scratchCardData = {
              id: scratchResult.id,
              won,
              rewardTitle: won && selectedPrize ? selectedPrize.reward_title : null,
              rewardDescription: won && selectedPrize ? selectedPrize.reward_description : null,
              rewardImageUrl: won && selectedPrize ? selectedPrize.reward_image_url : null,
            };
            console.log("Scratch card result:", { id: scratchResult.id, won, prize: selectedPrize?.reward_title });
          } else if (scratchError) {
            console.error("Error inserting scratch card result:", scratchError);
          }
        }
      } catch (scratchErr) {
        console.error("Scratch card logic error (non-fatal):", scratchErr);
      }

      console.log("Scan auto-approved:", {
        scanId: newScan?.id,
        newStamps,
        maxStampsRequired,
        rewardEarned: !!reachedReward,
        cardCompleted: isCompleted,
        hasScratchCard: !!scratchCardData,
      });

      return new Response(
        JSON.stringify({
          success: true,
          pendingApproval: false,
          currentStamps: newStamps,
          totalStamps: maxStampsRequired,
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.slug,
          restaurantId: restaurant.id,
          rewardEarned: !!reachedReward,
          cardCompleted: isCompleted,
          branchName: matchedBranchName,
          scratchCard: scratchCardData,
          scanId: newScan.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pending approval
    const currentStamps = loyaltyCard.current_stamps || 0;

    console.log("Scan recorded as pending:", {
      scanId: newScan?.id,
      currentStamps,
      stampsRequired,
      reason: !userLatitude ? "no_location" : "remote_scan",
    });

    return new Response(
      JSON.stringify({
        success: true,
        pendingApproval: true,
        currentStamps: currentStamps,
        totalStamps: stampsRequired,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        restaurantId: restaurant.id,
        rewardEarned: false,
        scanId: newScan.id,
        message: "Scan recorded! Waiting for staff approval to add your stamp.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Process scan error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
