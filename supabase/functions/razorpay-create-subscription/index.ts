import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan tier to Razorpay Plan ID mapping
const PLAN_MAP: Record<string, { planId: string; price: number }> = {
  starter: { planId: "plan_SJaiNbYPVZ4EAW", price: 999 },
  growth: { planId: "plan_SJajOqY647gBDb", price: 2499 },
  pro: { planId: "plan_SJaqry4l3WDOzd", price: 4999 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));
    const { userId, restaurantId, planTier } = body;
    const tier = (planTier || "starter").toLowerCase();
    console.log("Creating Razorpay subscription for user:", userId, "tier:", tier);

    if (!userId) {
      console.error("Missing userId");
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planConfig = PLAN_MAP[tier];
    if (!planConfig) {
      return new Response(
        JSON.stringify({ error: "Invalid plan tier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("Razorpay credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment system not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, phone_number")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has an ACTIVE subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, razorpay_subscription_id, razorpay_customer_id, status, plan_tier")
      .eq("user_id", userId)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // We allow creating a new subscription even if one is active to support upgrades/switches
    // The previous subscription will remain active until it expires or is manually cancelled, 
    // or we could handle cancellation here if we want to be more proactive.

    // Step 1: Create or get Razorpay customer
    let razorpayCustomerId = existingSub?.razorpay_customer_id;

    if (!razorpayCustomerId) {
      console.log("Creating Razorpay customer...");

      let phone = profile.phone_number || "";
      if (phone && !phone.startsWith("+")) {
        phone = phone.startsWith("91") && phone.length > 10 ? `+${phone}` : `+91${phone}`;
      }

      const customerPayload: Record<string, any> = {
        name: profile.full_name || "Customer",
        contact: phone,
        notes: { user_id: userId },
      };

      if (profile.email && !profile.email.endsWith("@druto.app")) {
        customerPayload.email = profile.email;
      }

      console.log("Customer payload:", JSON.stringify(customerPayload));

      const customerResponse = await fetch("https://api.razorpay.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerPayload),
      });

      const customerData = await customerResponse.json();
      console.log("Customer response:", JSON.stringify(customerData));

      if (customerData.error) {
        console.error("Customer creation error:", JSON.stringify(customerData.error));
        return new Response(
          JSON.stringify({
            error: customerData.error.description || "Failed to create customer",
            details: customerData.error
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      razorpayCustomerId = customerData.id;
    }

    // Step 2: Create subscription with selected plan
    const PLAN_ID = planConfig.planId;
    console.log("Creating Razorpay subscription with plan:", PLAN_ID, "tier:", tier, "customer:", razorpayCustomerId);

    const createSubscription = async (customerId: string) => {
      const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: PLAN_ID,
          customer_id: customerId,
          total_count: 12, // Reduced to 12 years for accuracy
          customer_notify: 1,
          notes: {
            user_id: userId,
            restaurant_id: restaurantId || "",
            plan_tier: tier,
          },
        }),
      });
      return response.json();
    };

    let subscriptionData = await createSubscription(razorpayCustomerId);
    console.log("Subscription response:", JSON.stringify(subscriptionData));

    // If customer ID is stale/invalid, recreate customer and retry
    if (subscriptionData.error?.code === "BAD_REQUEST_ERROR" &&
      subscriptionData.error?.description?.includes("id provided does not exist")) {
      console.log("Customer ID may be stale, recreating customer...");

      let phone = profile.phone_number || "";
      if (phone && !phone.startsWith("+")) {
        phone = phone.startsWith("91") && phone.length > 10 ? `+${phone}` : `+91${phone}`;
      }

      const customerPayload: Record<string, any> = {
        name: profile.full_name || "Customer",
        contact: phone,
        notes: { user_id: userId },
      };
      if (profile.email && !profile.email.endsWith("@druto.app")) {
        customerPayload.email = profile.email;
      }

      const customerResponse = await fetch("https://api.razorpay.com/v1/customers", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerPayload),
      });
      const newCustomerData = await customerResponse.json();
      console.log("New customer response:", JSON.stringify(newCustomerData));

      if (newCustomerData.error) {
        return new Response(
          JSON.stringify({ error: newCustomerData.error.description || "Failed to create customer" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      razorpayCustomerId = newCustomerData.id;

      if (existingSub) {
        await supabase
          .from("subscriptions")
          .update({ razorpay_customer_id: razorpayCustomerId })
          .eq("id", existingSub.id);
      }

      subscriptionData = await createSubscription(razorpayCustomerId);
      console.log("Retry subscription response:", JSON.stringify(subscriptionData));
    }

    if (subscriptionData.error) {
      console.error("Razorpay subscription error:", JSON.stringify(subscriptionData.error));
      return new Response(
        JSON.stringify({
          error: subscriptionData.error.description || "Failed to create subscription",
          details: subscriptionData.error
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Update or create subscription record with plan_tier
    if (existingSub) {
      console.log("Updating existing subscription record:", existingSub.id);
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          razorpay_subscription_id: subscriptionData.id,
          razorpay_customer_id: razorpayCustomerId,
          razorpay_plan_id: PLAN_ID,
          plan_tier: tier,
          status: existingSub.status === 'expired' ? 'trialing' : existingSub.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);
      
      if (updateError) {
        console.error("Error updating subscription record:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to sync subscription record", details: updateError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("Inserting new subscription record for user:", userId);
      const { error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          restaurant_id: restaurantId,
          razorpay_subscription_id: subscriptionData.id,
          razorpay_customer_id: razorpayCustomerId,
          razorpay_plan_id: PLAN_ID,
          plan_tier: tier,
          status: "trialing",
        });
        
      if (insertError) {
        console.error("Error inserting subscription record:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create subscription record", details: insertError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Subscription record synced successfully:", subscriptionData.id, "tier:", tier);

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscriptionData.id,
        shortUrl: subscriptionData.short_url,
        keyId: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});