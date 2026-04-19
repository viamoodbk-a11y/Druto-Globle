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
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch profile and restaurant in parallel (bypasses RLS)
    const [profileRes, restaurantRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, phone_number, email").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("restaurants").select("id, name, description, category, phone, email, website, address, city, opening_hours, logo_url, cover_image_url, latitude, longitude, social_links, owner_id, require_approval").eq("owner_id", userId).maybeSingle(),
    ]);

    if (profileRes.error) {
      console.error("Profile fetch error:", profileRes.error);
    }
    if (restaurantRes.error) {
      console.error("Restaurant fetch error:", restaurantRes.error);
    }

    const profile = profileRes.data;
    const restaurant = restaurantRes.data;

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        restaurant: restaurant
          ? {
            id: restaurant.id,
            name: restaurant.name,
            description: restaurant.description || "",
            category: restaurant.category || "cafe",
            phone: restaurant.phone || "",
            email: restaurant.email || "",
            website: restaurant.website || "",
            address: restaurant.address || "",
            city: restaurant.city || "",
            openingHours: restaurant.opening_hours || null,
            logoUrl: restaurant.logo_url,
            coverImageUrl: restaurant.cover_image_url,
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            socialLinks: restaurant.social_links || null,
            requireApproval: restaurant.require_approval,
          }
          : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("get-owner-profile-data error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
