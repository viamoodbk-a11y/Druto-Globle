import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_ID_TO_TIER: Record<string, string> = {
  // Current Plans
  "plan_SJaiNbYPVZ4EAW": "starter",
  "plan_SJajOqY647gBDb": "growth",
  "plan_SJaqry4l3WDOzd": "pro",
  
  // Legacy Plans
  "plan_SGMz3aZbgxgcBy": "starter",
  "plan_SG8ASWogbmPEcY": "starter",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.text();
    console.log("Webhook received, body length:", body.length);

    const payload = JSON.parse(body);
    const event = payload.event;
    console.log("Razorpay webhook event:", event);

    // Verify webhook signature if secret is configured
    const signature = req.headers.get("x-razorpay-signature");
    if (RAZORPAY_WEBHOOK_SECRET && signature) {
      const expectedSignature = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature.");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Webhook signature verified");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get entities from payload
    const subscriptionEntity = payload.payload?.subscription?.entity;
    const planId = subscriptionEntity?.plan_id;
    const paymentEntity = payload.payload?.payment?.entity;

    // Extract identifiers from payload
    let razorpaySubscriptionId = subscriptionEntity?.id || paymentEntity?.subscription_id;
    const razorpayCustomerId = subscriptionEntity?.customer_id || paymentEntity?.customer_id || paymentEntity?.notes?.customer_id;
    const userIdInNotes = subscriptionEntity?.notes?.user_id || paymentEntity?.notes?.user_id;

    console.log("Identifiers - SubID:", razorpaySubscriptionId, "CustID:", razorpayCustomerId, "UserID in Notes:", userIdInNotes);

    // Attempt to find the subscription in our database
    let subscriptionMetadata: any = null;

    // 1. Match by razorpay_subscription_id
    if (razorpaySubscriptionId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, user_id, status")
        .eq("razorpay_subscription_id", razorpaySubscriptionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        subscriptionMetadata = data;
        console.log("Found subscription by Razorpay ID:", data.id);
      } else if (error) {
        console.error("Error looking up by Sub ID:", error);
      }
    }

    // 2. Fallback: Match by user_id from notes
    if (!subscriptionMetadata && userIdInNotes) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, user_id, status")
        .eq("user_id", userIdInNotes)
        .order("status", { ascending: true }) // active before others
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        subscriptionMetadata = data;
        console.log("Found subscription by User ID (notes fallback):", data.id);
        
        // AUTO-LINK: If we found it by user but ID was missing/different, link it now
        if (razorpaySubscriptionId) {
          console.log("Auto-linking Razorpay Subscription ID...");
          await supabase
            .from("subscriptions")
            .update({ razorpay_subscription_id: razorpaySubscriptionId })
            .eq("id", data.id);
        }
      } else if (error) {
        console.error("Error looking up by User ID:", error);
      }
    }

    // 3. Second Fallback: Match by razorpay_customer_id
    if (!subscriptionMetadata && razorpayCustomerId) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, user_id, status")
        .eq("razorpay_customer_id", razorpayCustomerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        subscriptionMetadata = data;
        console.log("Found subscription by Customer ID fallback:", data.id);

        if (razorpaySubscriptionId) {
          console.log("Auto-linking Razorpay Subscription ID (from customer lookup)...");
          await supabase
            .from("subscriptions")
            .update({ razorpay_subscription_id: razorpaySubscriptionId })
            .eq("id", data.id);
        }
      } else if (error) {
        console.error("Error looking up by Customer ID:", error);
      }
    }

    const finalUserId = userIdInNotes || subscriptionMetadata?.user_id;
    console.log(`Processing event: ${event} | RazpSubID: ${razorpaySubscriptionId} | UserID: ${finalUserId}`);

    if (!razorpaySubscriptionId && !finalUserId) {
      console.log("No identifier found in webhook payload to link with database");
      return new Response(JSON.stringify({ received: true, message: "No identifiers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subscriptionMetadata) {
      console.warn("Could not find subscription in DB to update status.");
    }

    const updateDB = async (updateData: any) => {
      if (!subscriptionMetadata) return;
      const { error } = await supabase
        .from("subscriptions")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionMetadata.id);
      
      if (error) console.error("Database update error:", error);
      else console.log("Database updated successfully");
    };

    switch (event) {
      case "subscription.authenticated":
      case "subscription.activated": {
        const currentPeriodEnd = subscriptionEntity?.current_end
          ? new Date(subscriptionEntity.current_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const currentPeriodStart = subscriptionEntity?.current_start
          ? new Date(subscriptionEntity.current_start * 1000).toISOString()
          : new Date().toISOString();

        const tierFromPlan = planId ? PLAN_ID_TO_TIER[planId] : undefined;
        
        const updateObj: Record<string, any> = {
          status: "active",
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
        };
        if (tierFromPlan) updateObj.plan_tier = tierFromPlan;
        if (razorpaySubscriptionId) updateObj.razorpay_subscription_id = razorpaySubscriptionId;

        await updateDB(updateObj);
        break;
      }

      case "subscription.charged": {
        const currentPeriodEnd = subscriptionEntity?.current_end
          ? new Date(subscriptionEntity.current_end * 1000).toISOString()
          : new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString();

        await updateDB({
          status: "active",
          current_period_end: currentPeriodEnd,
        });

        // Record the payment
        if (paymentEntity && finalUserId) {
          const { error: payError } = await supabase.from("payment_history").insert({
            user_id: finalUserId,
            subscription_id: subscriptionMetadata?.id,
            amount: paymentEntity.amount / 100, // DB stores in Rupee
            currency: paymentEntity.currency || "INR",
            status: "completed",
            razorpay_payment_id: paymentEntity.id,
            description: "Subscription renewal charge",
            payment_method: paymentEntity.method,
          });
          if (payError) console.error("Payment recording error:", payError);
        }
        break;
      }

      case "subscription.pending":
      case "subscription.halted": {
        await updateDB({ status: "past_due" });
        break;
      }

      case "subscription.cancelled": {
        await updateDB({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        });
        break;
      }

      case "payment.captured":
      case "payment.failed": {
        const isSuccess = event === "payment.captured";
        
        if (isSuccess) {
          await updateDB({ status: "active" });
        }

        if (paymentEntity && finalUserId) {
          const { error: payError } = await supabase.from("payment_history").insert({
            user_id: finalUserId,
            subscription_id: subscriptionMetadata?.id,
            amount: paymentEntity.amount / 100,
            currency: paymentEntity.currency || "INR",
            status: isSuccess ? "completed" : "failed",
            razorpay_payment_id: paymentEntity.id,
            description: isSuccess ? "Subscription payment" : "Payment failed",
            payment_method: paymentEntity.method,
          });
          if (payError) console.error("Payment recording error:", payError);
        }
        break;
      }

      default:
        console.log("Unhandled event:", event);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
