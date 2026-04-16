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
    const { claimedRewardId, ownerId, action } = await req.json();

    if (!claimedRewardId || !ownerId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing claimedRewardId, ownerId, or action" }),
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

    // First verify the owner owns the restaurant for this claimed reward
    const { data: claimedReward, error: fetchError } = await supabaseAdmin
      .from("claimed_rewards")
      .select("id, restaurant_id, is_redeemed, loyalty_card_id, user_id, reward_id")
      .eq("id", claimedRewardId)
      .single();

    if (fetchError || !claimedReward) {
      console.error("manage-claimed-reward: fetchError", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Claimed reward not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify owner owns this restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", claimedReward.restaurant_id)
      .eq("owner_id", ownerId)
      .single();

    if (restaurantError || !restaurant) {
      console.error("manage-claimed-reward: restaurantError", restaurantError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - not your restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (claimedReward.is_redeemed) {
      return new Response(
        JSON.stringify({ success: false, error: "Reward already processed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "accept") {
      // Mark as redeemed (accepted)
      const { error: updateError } = await supabaseAdmin
        .from("claimed_rewards")
        .update({
          is_redeemed: true,
          redeemed_at: new Date().toISOString(),
        })
        .eq("id", claimedRewardId);

      if (updateError) {
        console.error("manage-claimed-reward: acceptError", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to accept reward" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // After accepting, reset the loyalty card for a new cycle so customer can start collecting again
      if (claimedReward.loyalty_card_id) {
        // Get the reward's expiry days for the new card cycle
        const { data: rewardData } = await supabaseAdmin
          .from("rewards")
          .select("expiry_days")
          .eq("id", claimedReward.reward_id)
          .single();
        
        const expiryDays = rewardData?.expiry_days || 30;
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + expiryDays);

        const { error: resetError } = await supabaseAdmin
          .from("loyalty_cards")
          .update({
            current_stamps: 0,
            is_completed: false,
            completed_at: null,
            expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimedReward.loyalty_card_id);

        if (resetError) {
          console.error("manage-claimed-reward: resetCardError", resetError);
          // Don't fail the whole request - the reward is already redeemed
        } else {
          console.log("manage-claimed-reward: reset loyalty card for new cycle", claimedReward.loyalty_card_id);
        }
      }

      console.log("manage-claimed-reward: accepted", claimedRewardId);
      return new Response(
        JSON.stringify({ success: true, action: "accepted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Decline - delete the claimed reward so user can try again
      const { error: deleteError } = await supabaseAdmin
        .from("claimed_rewards")
        .delete()
        .eq("id", claimedRewardId);

      if (deleteError) {
        console.error("manage-claimed-reward: declineError", deleteError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to decline reward" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("manage-claimed-reward: declined (deleted)", claimedRewardId);
      return new Response(
        JSON.stringify({ success: true, action: "declined" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("manage-claimed-reward error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
