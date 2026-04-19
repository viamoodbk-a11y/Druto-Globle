import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ownerId, name, category, address, phone, email, description, latitude, longitude, openingHours, website, city } = await req.json();
    console.log("Create restaurant request:", { ownerId, name, category, website, city });

    if (!ownerId || !name) {
      return new Response(
        JSON.stringify({ error: "Owner ID and business name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user already has a restaurant
    const { data: existingRestaurant } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (existingRestaurant) {
      // Update existing restaurant
      const { data: restaurant, error: updateError } = await supabaseAdmin
        .from("restaurants")
        .update({
          name,
          category: category || "cafe",
          address: address || null,
          phone: phone || null,
          email: email || null,
          description: description || null,
          latitude: latitude || null,
          longitude: longitude || null,
          opening_hours: openingHours || null,
          website: website || null,
          city: city || null,
        })
        .eq("id", existingRestaurant.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating restaurant:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update restaurant", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Restaurant updated:", restaurant);

      return new Response(
        JSON.stringify({
          success: true,
          restaurant: restaurant,
          updated: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new restaurant using admin client (bypasses RLS)
    const { data: restaurant, error: insertError } = await supabaseAdmin
      .from("restaurants")
      .insert({
        owner_id: ownerId,
        name,
        category: category || "cafe",
        address: address || null,
        phone: phone || null,
        email: email || null,
        description: description || null,
        latitude: latitude || null,
        longitude: longitude || null,
        opening_hours: openingHours || null,
        website: website || null,
        city: city || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating restaurant:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create restaurant", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Restaurant created:", restaurant);

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: restaurant,
        created: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Create restaurant error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
