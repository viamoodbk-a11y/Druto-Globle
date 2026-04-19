import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_PLAN_IDS: Record<string, string> = {
  starter: "plan_SJaiNbYPVZ4EAW",
  growth: "plan_SJajOqY647gBDb",
  pro: "plan_SJaqry4l3WDOzd",
};

Deno.serve(async (req) => {
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const { targetUserId, action, adminNotes, planTier, duration, razorpaySubscriptionId } = await req.json();
    console.log("Admin subscription action:", action, "for user:", targetUserId);

    if (!targetUserId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (adminNotes) {
      updateData.admin_notes = adminNotes;
    }

    if (razorpaySubscriptionId) {
      updateData.razorpay_subscription_id = razorpaySubscriptionId;
    }

    // Normalize plan tier to lowercase if provided
    const normalizedPlanTier = planTier?.toLowerCase();

    switch (action) {
      case "activate":
      case "grant_access":
        updateData.status = "active";
        updateData.admin_override = true;
        updateData.current_period_start = new Date().toISOString();

        // Support setting plan tier during activation
        if (normalizedPlanTier && TIER_PLAN_IDS[normalizedPlanTier]) {
          updateData.plan_tier = normalizedPlanTier;
          updateData.razorpay_plan_id = TIER_PLAN_IDS[normalizedPlanTier];
        }

        // Default to 1 month unless "year" or 366 days is specified
        const durationDays = (duration === "year" || duration === 366 || duration === "366") ? 366 : 30;
        updateData.current_period_end = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        break;

      case "deactivate":
      case "revoke_access":
      case "cancel":
        updateData.status = "cancelled";
        updateData.admin_override = false;
        updateData.cancelled_at = new Date().toISOString();
        break;

      case "extend_30_days":
        const currentEnd30 = new Date();
        currentEnd30.setDate(currentEnd30.getDate() + 30);
        updateData.current_period_end = currentEnd30.toISOString();
        updateData.status = "active";
        break;

      case "extend_trial": {
        // Extend trial by 3 days from today (or from current trial end if still in future)
        const existingSubResult = await supabase
          .from("subscriptions")
          .select("trial_end, current_period_end, status")
          .eq("user_id", targetUserId)
          .maybeSingle();

        const existingSub = existingSubResult.data;
        let baseDate = new Date();

        // If the trial end is in the future, extend from there; otherwise from now
        if (existingSub?.trial_end) {
          const trialEndDate = new Date(existingSub.trial_end);
          if (trialEndDate > baseDate) baseDate = trialEndDate;
        }

        baseDate.setDate(baseDate.getDate() + 3);
        updateData.trial_end = baseDate.toISOString();
        updateData.status = "trialing";
        break;
      }

      case "manual_activate":
        updateData.status = "active";
        updateData.admin_override = true;
        updateData.current_period_start = new Date().toISOString();
        updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        
        if (normalizedPlanTier && TIER_PLAN_IDS[normalizedPlanTier]) {
          updateData.plan_tier = normalizedPlanTier;
          updateData.razorpay_plan_id = TIER_PLAN_IDS[normalizedPlanTier];
        }
        break;

      case "change_plan":
        if (!normalizedPlanTier || !TIER_PLAN_IDS[normalizedPlanTier]) {
          return new Response(
            JSON.stringify({ error: `Invalid plan tier: ${planTier}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updateData.plan_tier = normalizedPlanTier;
        updateData.razorpay_plan_id = TIER_PLAN_IDS[normalizedPlanTier];
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("user_id", targetUserId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Subscription updated successfully");

    return new Response(
      JSON.stringify({ success: true, action }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});