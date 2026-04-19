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
    const { restaurantId, rewards, config, userId, scratchCardConfigs, scratchCardConfig } = await req.json();
    if (!restaurantId || !userId) {
      throw new Error("Missing required fields: restaurantId and userId");
    }

    console.log("Saving rewards config for restaurant:", restaurantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify owner relationship
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("id", restaurantId)
      .single();

    if (restError || !restaurant) {
      throw new Error("Restaurant not found");
    }

    if (restaurant.owner_id !== userId) {
      throw new Error("Unauthorized: You are not the owner of this restaurant");
    }

    // Update restaurant-level settings (only if provided in config)
    if (config) {
      const updateData: any = {};
      if (config.googleReviewUrl !== undefined) updateData.google_review_url = config.googleReviewUrl || null;
      if (config.openingHours !== undefined) updateData.opening_hours = config.openingHours || null;
      
      if (Object.keys(updateData).length > 0) {
        const { error: restaurantError } = await supabase
          .from("restaurants")
          .update(updateData)
          .eq("id", restaurantId);

        if (restaurantError) {
          console.error("Error updating restaurant settings:", restaurantError);
        }
      }
    }

    // Handle multiple rewards if provided
    if (Array.isArray(rewards)) {
      // 1. Get existing active rewards to find which ones to deactivate
      const { data: existingRewards } = await supabase
        .from("rewards")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      const existingIds = existingRewards?.map(r => r.id) || [];
      const incomingIds = rewards.filter(r => r.id).map(r => r.id);
      const idsToDeactivate = existingIds.filter(id => !incomingIds.includes(id));

      // 2. Process each reward
      for (const reward of rewards) {        
        const rewardData = {
          restaurant_id: restaurantId,
          name: reward.name || (reward.description || "").substring(0, 50) || "Reward",
          description: reward.description || "",
          stamps_required: reward.stampsRequired,
          expiry_days: reward.expiryDays || 30,
          reward_image_url: reward.rewardImageUrl || null,
          is_active: true,
        };

        if (reward.id && !reward.id.startsWith('temp-')) {
          // Update existing
          const { error } = await supabase
            .from("rewards")
            .update(rewardData)
            .eq("id", reward.id)
            .eq("restaurant_id", restaurantId);
          if (error) {
            console.error(`Error updating reward ${reward.id}:`, error);
            throw new Error(`Failed to update reward: ${error.message}`);
          }
        } else {
          // Insert new
          const { error } = await supabase.from("rewards").insert(rewardData);
          if (error) {
            console.error("Error inserting reward:", error);
            throw new Error(`Failed to insert new reward: ${error.message}`);
          }
        }
      }

      // 3. Deactivate rewards not in the new list
      if (idsToDeactivate.length > 0) {
        const { error } = await supabase
          .from("rewards")
          .update({ is_active: false })
          .in("id", idsToDeactivate)
          .eq("restaurant_id", restaurantId);
        if (error) {
          console.error("Error deactivating rewards:", error);
          throw new Error(`Failed to remove old rewards: ${error.message}`);
        }
      }
    }

    // Handle scratch card configs if provided (support both new array and old object for cached clients)
    const activeScratchConfigs = Array.isArray(scratchCardConfigs) 
      ? scratchCardConfigs 
      : scratchCardConfig ? [scratchCardConfig] : undefined;

    if (Array.isArray(activeScratchConfigs)) {
      const { data: existingScratchConfigs } = await supabase
        .from("scratch_card_configs")
        .select("id")
        .eq("restaurant_id", restaurantId);

      const existingIds = existingScratchConfigs?.map(c => c.id) || [];
      const incomingIds = activeScratchConfigs.filter(c => c.id).map(c => c.id);
      const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));

      for (const config of activeScratchConfigs) {
        const scratchData = {
          restaurant_id: restaurantId,
          is_enabled: config.isEnabled || false,
          odds_numerator: config.oddsNumerator || 1,
          odds_denominator: config.oddsDenominator || 10,
          reward_title: config.rewardTitle || 'Surprise Reward',
          reward_description: config.rewardDescription || null,
          reward_image_url: config.rewardImageUrl || null,
          updated_at: new Date().toISOString(),
        };

        if (config.id && !config.id.startsWith('temp-')) {
          // Update existing
          const { error } = await supabase
            .from("scratch_card_configs")
            .update(scratchData)
            .eq("id", config.id)
            .eq("restaurant_id", restaurantId);
          if (error) {
            console.error(`Error updating scratch config ${config.id}:`, error);
            throw new Error(`Failed to update scratch card: ${error.message}`);
          }
        } else {
          // Insert
          const { error } = await supabase
            .from("scratch_card_configs")
            .insert(scratchData);
          if (error) {
            console.error("Error inserting scratch config:", error);
            throw new Error(`Failed to create scratch card: ${error.message}`);
          }
        }
      }

      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from("scratch_card_configs")
          .delete()
          .in("id", idsToDelete)
          .eq("restaurant_id", restaurantId);
        if (error) {
          console.error("Error deleting old scratch configs:", error);
          throw new Error(`Failed to remove old scratch card: ${error.message}`);
        }
      }

      console.log("Scratch card configs saved successfully");
    }

    console.log("Rewards config saved successfully");

    const { data: latestConfigs } = await supabase
      .from("scratch_card_configs")
      .select("id, is_enabled, odds_numerator, odds_denominator, reward_title, reward_description, reward_image_url")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    const formattedConfigs = (latestConfigs || []).map((c: any) => ({
      id: c.id,
      isEnabled: c.is_enabled,
      oddsNumerator: c.odds_numerator,
      oddsDenominator: c.odds_denominator,
      rewardTitle: c.reward_title,
      rewardDescription: c.reward_description,
      rewardImageUrl: c.reward_image_url,
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        scratchCardConfigs: formattedConfigs 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Save reward config error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
