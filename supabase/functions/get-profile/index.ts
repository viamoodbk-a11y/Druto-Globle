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
    const { userId } = await req.json();
    console.log("Get profile request for userId:", userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch profile and counts in parallel
    const [profileRes, scansRes, rewardsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("scans")
        .select("*", { count: "estimated", head: true })
        .eq("user_id", userId),

      supabaseAdmin
        .from("claimed_rewards")
        .select("*", { count: "estimated", head: true })
        .eq("user_id", userId)
    ]);

    if (profileRes.error) console.error("Error fetching profile:", profileRes.error);
    if (scansRes.error) console.error("Error fetching scans count:", scansRes.error);
    if (rewardsRes.error) console.error("Error fetching rewards count:", rewardsRes.error);

    const profile = profileRes.data;
    const totalVisits = scansRes.count || 0;
    const rewardsEarned = rewardsRes.count || 0;

    console.log("Profile fetched:", profile?.id);
    console.log("Scans count:", totalVisits);
    console.log("Rewards count:", rewardsEarned);

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        totalVisits,
        rewardsEarned,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Get profile error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
