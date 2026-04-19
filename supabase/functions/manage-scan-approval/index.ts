import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scanId, ownerId, action } = await req.json();
    console.log("manage-scan-approval request:", { scanId, ownerId, action });

    if (!scanId || !ownerId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing scanId, ownerId, or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action !== "accept" && action !== "decline") {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action. Must be 'accept' or 'decline'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // First verify the scan exists and get details
    const { data: scan, error: fetchError } = await supabaseAdmin
      .from("scans")
      .select("id, restaurant_id, user_id, loyalty_card_id, staff_approved")
      .eq("id", scanId)
      .single();

    if (fetchError || !scan) {
      console.error("manage-scan-approval: fetchError", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Scan not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify owner owns this restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", scan.restaurant_id)
      .eq("owner_id", ownerId)
      .single();

    if (restaurantError || !restaurant) {
      console.error("manage-scan-approval: restaurantError", restaurantError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - not your restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (scan.staff_approved) {
      return new Response(
        JSON.stringify({ success: false, error: "Scan already approved" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "accept") {
      // Fetch all rewards for this restaurant to calculate milestones correctly
      const { data: rewards, error: rewardsError } = await supabaseAdmin
        .from("rewards")
        .select("id, stamps_required, expiry_days")
        .eq("restaurant_id", scan.restaurant_id)
        .eq("is_active", true)
        .order("stamps_required", { ascending: true });

      if (rewardsError) {
        console.error("manage-scan-approval: rewardsError", rewardsError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch reward configuration" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const maxStampsRequired = rewards && rewards.length > 0 
        ? Math.max(...rewards.map(r => r.stamps_required)) 
        : 10;

      // === SCRATCH CARD LOGIC (same as auto-approve path) ===
      // CRITICAL: We do this BEFORE marking the scan as approved to avoid race conditions 
      // where the client receives the approval event and queries for scratch cards too early.
      try {
        const { data: scratchConfigs } = await supabaseAdmin
          .from("scratch_card_configs")
          .select("id, is_enabled, odds_numerator, odds_denominator, reward_title, reward_description, reward_image_url")
          .eq("restaurant_id", scan.restaurant_id)
          .eq("is_enabled", true);

        if (scratchConfigs && scratchConfigs.length > 0) {
          const scratchConfig = scratchConfigs[Math.floor(Math.random() * scratchConfigs.length)];
          const odds = (scratchConfig.odds_numerator || 1) / (scratchConfig.odds_denominator || 10);
          const won = Math.random() < odds;

          const scratchInsert: Record<string, any> = {
            user_id: scan.user_id,
            restaurant_id: scan.restaurant_id,
            scan_id: scanId,
            won,
            status: "pending",
          };

          if (won) {
            scratchInsert.reward_title = scratchConfig.reward_title;
            scratchInsert.reward_description = scratchConfig.reward_description;
            scratchInsert.reward_image_url = scratchConfig.reward_image_url;
          }

          const { error: scratchError } = await supabaseAdmin
            .from("scratch_card_results")
            .insert(scratchInsert);

          if (scratchError) {
            console.error("Scratch card insert error (non-fatal):", scratchError);
          } else {
            console.log("Scratch card result recorded on approval:", { won });
          }
        }
      } catch (scratchErr) {
        console.error("Scratch card logic error (non-fatal):", scratchErr);
      }

      // Now we need to add the stamp to the loyalty card
      if (scan.loyalty_card_id) {
        // Get the loyalty card
        const { data: loyaltyCard, error: cardError } = await supabaseAdmin
          .from("loyalty_cards")
          .select("id, current_stamps, total_visits, is_completed, reward_id")
          .eq("id", scan.loyalty_card_id)
          .single();

        if (cardError || !loyaltyCard) {
          console.error("manage-scan-approval: cardFetchError", cardError);
          return new Response(
            JSON.stringify({ success: false, error: "Customer loyalty card not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!loyaltyCard.is_completed) {
          const newStamps = (loyaltyCard.current_stamps || 0) + 1;
          
          // Determine if a reward was reached AT THIS STEP
          const reachedReward = rewards?.find(r => r.stamps_required === newStamps);
          
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
            console.error("manage-scan-approval: cardUpdateError", cardUpdateError);
            return new Response(
              JSON.stringify({ success: false, error: "Failed to update customer stamp count" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // If a reward was reached (even if it's not the final one), claim it
          if (reachedReward) {
            const rewardExpiryDays = reachedReward.expiry_days || 7;
            const rewardExpiresAt = new Date();
            rewardExpiresAt.setDate(rewardExpiresAt.getDate() + rewardExpiryDays);

            const { error: claimError } = await supabaseAdmin.from("claimed_rewards").insert({
              user_id: scan.user_id,
              restaurant_id: scan.restaurant_id,
              reward_id: reachedReward.id,
              loyalty_card_id: loyaltyCard.id,
              expires_at: rewardExpiresAt.toISOString(),
            });

            if (claimError) {
              console.error("manage-scan-approval: claimRewardError", claimError);
            }
            
            console.log(`Milestone reward reached (${newStamps} stamps) for user:`, scan.user_id);
          }
        }
      }

      // Mark scan as approved
      const { error: updateError } = await supabaseAdmin
        .from("scans")
        .update({ staff_approved: true })
        .eq("id", scanId);

      if (updateError) {
        console.error("manage-scan-approval: acceptError", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to accept scan" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("manage-scan-approval: accepted", scanId);
      return new Response(
        JSON.stringify({ success: true, action: "accepted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Decline - delete the scan and don't add stamp
      const { error: deleteError } = await supabaseAdmin
        .from("scans")
        .delete()
        .eq("id", scanId);

      if (deleteError) {
        console.error("manage-scan-approval: declineError", deleteError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to decline scan" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("manage-scan-approval: declined (deleted)", scanId);
      return new Response(
        JSON.stringify({ success: true, action: "declined" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("manage-scan-approval error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
