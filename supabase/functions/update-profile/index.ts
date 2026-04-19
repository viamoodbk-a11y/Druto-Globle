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
    const { userId, fullName, email, phone, avatarUrl } = await req.json();
    console.log("Update profile request:", { userId, fullName, email, avatarUrl });

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Upsert profile using admin client (bypasses RLS)
    const upsertData: Record<string, any> = { id: userId };
    if (fullName) upsertData.full_name = fullName;
    if (email) upsertData.email = email;
    if (phone) upsertData.phone_number = phone;
    if (avatarUrl !== undefined) upsertData.avatar_url = avatarUrl;

    const { data: profile, error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(upsertData, { onConflict: "id" })
      .select()
      .single();

    if (upsertError) {
      console.error("Error upserting profile:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile", details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile updated successfully:", profile);

    return new Response(
      JSON.stringify({
        success: true,
        profile: profile,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Update profile error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
