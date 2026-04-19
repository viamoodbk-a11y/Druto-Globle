import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { userId, pushToken, deviceToken, tokenType } = await req.json();

        if (!userId || (!pushToken && !deviceToken)) {
            return new Response(
                JSON.stringify({ error: "User ID and at least one token are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Update profile with both Expo and Native tokens if provided
        const updateData: any = {};
        if (pushToken) updateData.push_token = pushToken;
        if (deviceToken) updateData.device_token = deviceToken;
        if (tokenType) updateData.token_type = tokenType;

        const { error } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("id", userId);

        if (error) {
            console.error("Error updating push token:", error);
            throw error;
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
            JSON.stringify({ error: "Internal server error", details: errorMessage }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
