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
    const { claimedRewardId, ownerId } = await req.json();

    if (!claimedRewardId || !ownerId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing claimedRewardId or ownerId" }),
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
      .select("id, restaurant_id, is_redeemed")
      .eq("id", claimedRewardId)
      .single();

    if (fetchError || !claimedReward) {
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
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - not your restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (claimedReward.is_redeemed) {
      return new Response(
        JSON.stringify({ success: false, error: "Already redeemed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as redeemed
    const { error: updateError } = await supabaseAdmin
      .from("claimed_rewards")
      .update({
        is_redeemed: true,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", claimedRewardId);

    if (updateError) {
      console.error("redeem-claimed-reward: updateError", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to redeem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("redeem-claimed-reward error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
