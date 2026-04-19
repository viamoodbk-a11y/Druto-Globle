import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    "special reward",
    "loyalty reward"
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
    console.log("Get customer data for userId:", userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: result, error } = await supabaseAdmin.rpc("get_customer_data_v3", { c_user_id: userId });

    if (error || !result) {
      console.error("RPC Error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch customer data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.success && result.loyaltyCards && result.loyaltyCards.length > 0) {
      const restaurantIds = [...new Set(result.loyaltyCards.map((c: any) => c.restaurant_id))];
      
      const { data: allRewards, error: rewardsError } = await supabaseAdmin
        .from("rewards")
        .select("id, restaurant_id, name, description, stamps_required, reward_image_url")
        .in("restaurant_id", restaurantIds)
        .eq("is_active", true)
        .order("stamps_required", { ascending: true });

      if (!rewardsError && allRewards) {
        result.loyaltyCards = result.loyaltyCards.map((card: any) => ({
          ...card,
          all_rewards: allRewards
            .filter((r: any) => r.restaurant_id === card.restaurant_id)
            .map((r: any) => ({
              ...r,
              name: getCorrectRewardTitle(r.name, r.description),
            }))
        }));
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Get customer data error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});