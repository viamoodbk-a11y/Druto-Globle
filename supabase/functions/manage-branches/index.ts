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
        const { action, restaurantId, userId, branchData, branchId } = await req.json();

        if (!restaurantId || !userId) {
            throw new Error("Missing restaurantId or userId");
        }

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

        if (action === "create") {
            const { name, latitude, longitude } = branchData;
            if (!name || latitude === undefined || longitude === undefined) {
                throw new Error("Missing branch details (name, latitude, longitude)");
            }

            const { data, error } = await supabase
                .from("branches")
                .insert({
                    restaurant_id: restaurantId,
                    name,
                    latitude,
                    longitude,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;

            return new Response(JSON.stringify({ success: true, data }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (action === "delete") {
            if (!branchId) throw new Error("Missing branchId");

            const { error } = await supabase
                .from("branches")
                .delete()
                .eq("id", branchId)
                .eq("restaurant_id", restaurantId); // Security double check

            if (error) throw error;

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        throw new Error("Invalid action");
    } catch (error: any) {
        console.error("Manage branches error:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
