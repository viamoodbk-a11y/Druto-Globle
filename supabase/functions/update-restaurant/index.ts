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
    const { restaurantId, field, value, userId } = await req.json();

    if (!restaurantId || !field || !userId) {
      throw new Error("Missing required fields");
    }

    console.log("Updating restaurant:", { restaurantId, field, userId });

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

    // Update the specified field
    const updateData: Record<string, any> = {};
    
    switch (field) {
      case "logo_url":
      case "cover_image_url":
      case "google_review_url":
      case "opening_hours":
      case "social_links":
      case "require_approval":
        updateData[field] = value;
        break;
      default:
        throw new Error("Invalid field");
    }

    const { error: updateError } = await supabase
      .from("restaurants")
      .update(updateData)
      .eq("id", restaurantId);

    if (updateError) {
      console.error("Error updating restaurant:", updateError);
      throw new Error(updateError.message);
    }

    console.log("Restaurant updated successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Update restaurant error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
