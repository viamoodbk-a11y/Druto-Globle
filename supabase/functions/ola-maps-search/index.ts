import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OLA_MAPS_API_KEY");
    if (!apiKey) {
      throw new Error("OLA_MAPS_API_KEY not configured");
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("query");
    const placeId = url.searchParams.get("placeId");
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    // Reverse geocoding - get address from coordinates
    if (lat && lng) {
      console.log("Reverse geocoding for:", lat, lng);
      const response = await fetch(
        `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ola Maps reverse geocode error:", errorText);
        throw new Error("Failed to reverse geocode");
      }

      const data = await response.json();
      console.log("Reverse geocode response:", JSON.stringify(data));

      // Extract the formatted address
      const address = data.results?.[0]?.formatted_address || 
                      data.results?.[0]?.address_components?.map((c: any) => c.long_name).join(", ") ||
                      null;

      return new Response(JSON.stringify({ address, results: data.results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (placeId) {
      // Get place details
      console.log("Getting place details for:", placeId);
      const response = await fetch(
        `https://api.olamaps.io/places/v1/details?place_id=${encodeURIComponent(placeId)}&api_key=${apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ola Maps details error:", errorText);
        throw new Error("Failed to get place details");
      }

      const data = await response.json();
      console.log("Place details response:", JSON.stringify(data));

      return new Response(JSON.stringify({ result: data.result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (query) {
      // Autocomplete search
      console.log("Autocomplete search for:", query);
      const response = await fetch(
        `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query)}&api_key=${apiKey}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ola Maps autocomplete error:", errorText);
        throw new Error("Failed to search places");
      }

      const data = await response.json();
      console.log("Autocomplete response:", JSON.stringify(data));

      return new Response(JSON.stringify({ predictions: data.predictions || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Missing query, placeId, or lat/lng parameters" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Ola Maps search error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
