import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { businessId, action, adminNotes } = await req.json();

    if (!businessId || !action) {
      return new Response(
        JSON.stringify({ error: "businessId and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business and owner info
    const { data: business, error: bizError } = await supabase
      .from("restaurants")
      .select("id, owner_id, name")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case "delete":
        // Soft delete by setting is_active to false
        const { error: deleteError } = await supabase
          .from("restaurants")
          .update({ is_active: false })
          .eq("id", businessId);
        
        if (deleteError) throw deleteError;
        result = { success: true, message: "Business deactivated" };
        break;

      case "activate":
        // Reactivate business
        const { error: activateError } = await supabase
          .from("restaurants")
          .update({ is_active: true })
          .eq("id", businessId);
        
        if (activateError) throw activateError;
        result = { success: true, message: "Business activated" };
        break;

      case "subscribe":
        // Grant subscription access to business owner
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", business.owner_id)
          .maybeSingle();

        if (existingSub) {
          // Update existing subscription
          const { error: updateSubError } = await supabase
            .from("subscriptions")
            .update({
              status: "active",
              admin_override: true,
              admin_notes: adminNotes || `Subscribed by admin on ${new Date().toISOString()}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSub.id);
          
          if (updateSubError) throw updateSubError;
        } else {
          // Create new subscription
          const now = new Date();
          const trialEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
          
          const { error: insertSubError } = await supabase
            .from("subscriptions")
            .insert({
              user_id: business.owner_id,
              restaurant_id: businessId,
              status: "active",
              admin_override: true,
              admin_notes: adminNotes || `Subscribed by admin on ${now.toISOString()}`,
              trial_start: now.toISOString(),
              trial_end: trialEnd.toISOString(),
            });
          
          if (insertSubError) throw insertSubError;
        }
        result = { success: true, message: "Business subscribed" };
        break;

      case "unsubscribe":
        // Remove subscription access
        const { error: unsubError } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            admin_override: false,
            admin_notes: adminNotes || `Unsubscribed by admin on ${new Date().toISOString()}`,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", business.owner_id);
        
        if (unsubError) throw unsubError;
        result = { success: true, message: "Business unsubscribed" };
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Admin ${user.id} performed ${action} on business ${businessId}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in admin-manage-business:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
