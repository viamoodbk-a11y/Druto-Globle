import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, rewardId, restaurantId, loyaltyCardId } = await req.json();

    if (!userId || !rewardId || !restaurantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing userId, rewardId or restaurantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check for any existing claim for same loyalty card + reward
    // - If unredeemed: return it (idempotent)
    // - If already redeemed: block duplicate claims for the same completed card
    const { data: existingClaim, error: existingError } = await supabaseAdmin
      .from("claimed_rewards")
      .select("id, is_redeemed, redeemed_at")
      .eq("user_id", userId)
      .eq("reward_id", rewardId)
      .eq("loyalty_card_id", loyaltyCardId ?? null)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("claim-reward: existingError", existingError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check existing claims" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingClaim?.id) {
      const alreadyRedeemed = !!existingClaim.is_redeemed || !!existingClaim.redeemed_at;
      if (alreadyRedeemed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Reward already redeemed for this completed card",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("claim-reward: returning existing claim", existingClaim.id);
      return new Response(
        JSON.stringify({ success: true, claimedRewardId: existingClaim.id, reused: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get reward expiry_days from the reward configuration
    const { data: rewardData, error: rewardError } = await supabaseAdmin
      .from("rewards")
      .select("expiry_days")
      .eq("id", rewardId)
      .single();

    if (rewardError) {
      console.error("claim-reward: rewardError", rewardError);
    }

    // Calculate expiry based on reward config (default 7 days if not set)
    const expiryDays = rewardData?.expiry_days || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const { data: claimedReward, error: insertError } = await supabaseAdmin
      .from("claimed_rewards")
      .insert({
        user_id: userId,
        reward_id: rewardId,
        restaurant_id: restaurantId,
        loyalty_card_id: loyaltyCardId ?? null,
        expires_at: expiresAt.toISOString(),
        is_redeemed: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("claim-reward: insertError", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to claim reward" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("claim-reward: created new claim", claimedReward.id);

    return new Response(
      JSON.stringify({ success: true, claimedRewardId: claimedReward.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("claim-reward error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
