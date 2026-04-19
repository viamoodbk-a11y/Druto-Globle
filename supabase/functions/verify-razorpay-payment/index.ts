import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req.json();

    console.log("Verifying payment:", razorpay_payment_id, "for subscription:", razorpay_subscription_id);

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing payment details", verified: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RAZORPAY_KEY_SECRET) {
      console.error("Razorpay secret not configured");
      return new Response(
        JSON.stringify({ error: "Payment verification not configured", verified: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature as per Razorpay docs:
    // generated_signature = hmac_sha256(razorpay_payment_id + "|" + subscription_id, secret)
    const payload = razorpay_payment_id + "|" + razorpay_subscription_id;
    const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;
    console.log("Signature verification:", isValid ? "VALID" : "INVALID");

    if (isValid) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Determine plan duration
      const durationDays = 366; // Yearly plan based on ₹999 UI

      // Lookup the subscription to update
      let subscriptionIdToUpdate: string | null = null;
      let subDetails: { user_id: string; plan_tier: string } | null = null;

      // 1. Try by Razorpay Sub ID
      const { data: subById, error: errorById } = await supabase
        .from("subscriptions")
        .select("id, user_id, plan_tier")
        .eq("razorpay_subscription_id", razorpay_subscription_id)
        .limit(1)
        .maybeSingle();
      
      if (errorById) {
        console.error("Error fetching subscription by ID:", errorById);
      }

      if (subById) {
        subscriptionIdToUpdate = subById.id;
        subDetails = { user_id: subById.user_id, plan_tier: subById.plan_tier };
        console.log("Found subscription by Razorpay ID:", subById.id);
      } else {
        // 2. Try by finding the user's only subscription (fallback)
        console.log("Subscription not found by ID. Fetching user session for fallback...");
        const authHeader = req.headers.get("Authorization");
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.split(" ")[1] || "");
        
        if (authError) {
          console.error("Auth error during fallback:", authError);
        }

        if (user) {
          console.log("Found authenticated user:", user.id, "Searching for their subscription record...");
          const { data: subByUser, error: errorByUser } = await supabase
            .from("subscriptions")
            .select("id, plan_tier")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          
          if (errorByUser) {
            console.error("Error fetching subscription by User ID:", errorByUser);
          }

          if (subByUser) {
             subscriptionIdToUpdate = subByUser.id;
             subDetails = { user_id: user.id, plan_tier: subByUser.plan_tier };
             console.log("Found subscription by User fallback:", subByUser.id);
             
             // Link the missing ID now
             console.log("Linking Razorpay ID to existing subscription record...");
             await supabase
              .from("subscriptions")
              .update({ razorpay_subscription_id: razorpay_subscription_id })
              .eq("id", subByUser.id);
          } else {
            console.warn("No subscription record found for user:", user.id);
          }
        } else {
          console.error("No authenticated user found for fallback lookup");
        }
      }

      if (subscriptionIdToUpdate) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionIdToUpdate);

        if (error) {
          console.error("Error updating subscription in DB:", error);
        } else {
          console.log(`Subscription activated successfully via client-side verification`);
          
          // Record the payment in history immediately
          if (subDetails) {
            // Check for existing payment record to prevent duplicates
            const { data: existingPayment } = await supabase
              .from("payment_history")
              .select("id")
              .eq("razorpay_payment_id", razorpay_payment_id)
              .maybeSingle();

            if (!existingPayment) {
              const tier = subDetails.plan_tier || "starter";
              // Direct mapping based on current Pricing.tsx
              const amountMap: Record<string, number> = {
                starter: 999,
                growth: 2499,
                pro: 4999
              };
              const amount = amountMap[tier.toLowerCase()] || 999;
              
              const { error: payError } = await supabase.from("payment_history").insert({
                user_id: subDetails.user_id,
                subscription_id: subscriptionIdToUpdate,
                amount,
                currency: "INR",
                status: "completed",
                razorpay_payment_id: razorpay_payment_id,
                description: `Subscription ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
                payment_method: "Razorpay",
              });
              
              if (payError) {
                console.error("Error recording payment history:", payError);
              } else {
                console.log("Payment history recorded successfully");
              }
            } else {
              console.log("Payment history record already exists. Skipping insertion.");
            }
          }
        }
      } else {
        console.error("Could not find subscription record to activate for sub_id:", razorpay_subscription_id);
      }
    } else {
      console.error("Signature verification failed for subscription:", razorpay_subscription_id);
    }

    return new Response(
      JSON.stringify({ verified: isValid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message, verified: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});