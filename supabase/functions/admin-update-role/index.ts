import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Edge function for admin role management
// Only admins can change user roles between customer and owner
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user using anon client
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requester is admin
    const { data: adminRole } = await supabaseAnon
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      console.log("Non-admin attempted role change:", user.id);
      return new Response(JSON.stringify({ error: "Not authorized - admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { targetUserId, newRole } = await req.json();

    // Validate inputs
    if (!targetUserId || !newRole) {
      return new Response(JSON.stringify({ error: "Missing targetUserId or newRole" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent admin from changing their own role
    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: "Cannot change your own role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow changing to customer or restaurant_owner
    const validRoles = ["customer", "restaurant_owner"];
    if (!validRoles.includes(newRole)) {
      return new Response(JSON.stringify({ error: "Invalid role. Only customer or restaurant_owner allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if target user exists
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", targetUserId)
      .single();

    if (profileError || !targetProfile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if target is an admin (cannot demote admins)
    const { data: targetAdminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("role", "admin")
      .single();

    if (targetAdminRole) {
      return new Response(JSON.stringify({ error: "Cannot change admin roles" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current role
    const { data: currentRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", targetUserId)
      .neq("role", "admin");

    // Delete existing non-admin roles
    if (currentRoles && currentRoles.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .neq("role", "admin");

      if (deleteError) {
        console.error("Error deleting old role:", deleteError);
        return new Response(JSON.stringify({ error: "Failed to update role" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert new role
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: targetUserId,
        role: newRole,
      });

    if (insertError) {
      console.error("Error inserting new role:", insertError);
      return new Response(JSON.stringify({ error: "Failed to set new role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Admin ${user.id} changed user ${targetUserId} role to ${newRole}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Role updated to ${newRole}`,
        targetUser: targetProfile.full_name || targetUserId,
        newRole,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in admin-update-role:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
