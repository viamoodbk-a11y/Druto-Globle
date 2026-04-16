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
    const { userId, scratchCardId, action } = await req.json();

    if (!userId || !scratchCardId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing userId or scratchCardId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch the scratch card result
    const { data: scratchCard, error: fetchError } = await supabaseAdmin
      .from("scratch_card_results")
      .select("id, user_id, restaurant_id, won, status")
      .eq("id", scratchCardId)
      .single();

    if (fetchError || !scratchCard) {
      return new Response(
        JSON.stringify({ success: false, error: "Scratch card not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === CUSTOMER CLAIM / REDEEM ===
    if (!action || action === "claim" || action === "redeem") {
      // Validate ownership
      if (scratchCard.user_id !== userId) {
        return new Response(
          JSON.stringify({ success: false, error: "This scratch card doesn't belong to you" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!scratchCard.won) {
        return new Response(
          JSON.stringify({ success: false, error: "This scratch card was not a winner" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "redeem") {
        if (scratchCard.status !== "claimed" && scratchCard.status !== "redeeming" && scratchCard.status !== "pending") {
          return new Response(
            JSON.stringify({ success: false, error: `Can only redeem a 'claimed' or 'pending' reward. Current status: ${scratchCard.status}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from("scratch_card_results")
          .update({
            status: "redeeming",
          })
          .eq("id", scratchCardId);

        if (updateError) {
          console.error("claim-scratch-reward updateError (redeeming):", updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message || "Failed to set to redeeming state" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: "Scratch card reward ready to redeem!" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Default: Action is "claim"
      if (scratchCard.status !== "pending") {
        return new Response(
          JSON.stringify({ success: false, error: `Scratch card already ${scratchCard.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("scratch_card_results")
        .update({
          status: "claimed",
          claimed_at: new Date().toISOString(),
        })
        .eq("id", scratchCardId);

      if (updateError) {
        console.error("Error claiming scratch card:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to claim scratch card" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Scratch card claimed:", scratchCardId);
      return new Response(
        JSON.stringify({ success: true, message: "Scratch card reward claimed!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === OWNER ACCEPT / DECLINE ===
    if (action === "accept" || action === "decline") {
      // Verify owner
      const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("owner_id")
        .eq("id", scratchCard.restaurant_id)
        .single();

      if (!restaurant || restaurant.owner_id !== userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "accept") {
        const { error: updateError } = await supabaseAdmin
          .from("scratch_card_results")
          .update({
            status: "accepted",
            owner_accepted_at: new Date().toISOString(),
          })
          .eq("id", scratchCardId);

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to accept" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Scratch card accepted by owner:", scratchCardId);
        return new Response(
          JSON.stringify({ success: true, message: "Scratch card reward accepted!" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const { error: updateError } = await supabaseAdmin
          .from("scratch_card_results")
          .update({ status: "declined" })
          .eq("id", scratchCardId);

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to decline" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Scratch card declined by owner:", scratchCardId);
        return new Response(
          JSON.stringify({ success: true, message: "Scratch card reward declined" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("claim-scratch-reward error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
