import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAnon = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseAnon.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAnon
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = parseInt(body.pageSize) || 50;
    const page = parseInt(body.page) || 1;
    const search = body.search || "";
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("payment_history")
      .select("*", { count: "exact" });

    if (search) {
      // Searching by razorpay_payment_id or description
      query = query.or(`razorpay_payment_id.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: paymentsData, error: paymentsError, count: totalCount } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (paymentsError) throw paymentsError;

    // Fetch subscriptions to map restaurant info
    const subIds = [...new Set((paymentsData || []).map((p) => p.subscription_id).filter(Boolean))];
    const { data: subsData } = await supabaseAdmin
      .from("subscriptions")
      .select("id, restaurant_id")
      .in("id", subIds);

    const subMap: Record<string, string | null> = {};
    (subsData || []).forEach((s) => {
      subMap[s.id] = s.restaurant_id;
    });

    const restaurantIdsFromSubs = [...new Set(Object.values(subMap).filter(Boolean) as string[])];
    
    // Fallback: Fetch restaurant IDs directly for users whose payments have no subscription_id
    const userIdsWithNoSub = [...new Set((paymentsData || []).filter(p => !p.subscription_id).map(p => p.user_id))];
    const { data: userSubsData } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, restaurant_id")
      .in("user_id", userIdsWithNoSub);
    
    const userToRestaurantMap: Record<string, string> = {};
    (userSubsData || []).forEach(s => {
      if (s.restaurant_id) userToRestaurantMap[s.user_id] = s.restaurant_id;
    });

    const allRestaurantIds = [...new Set([...restaurantIdsFromSubs, ...Object.values(userToRestaurantMap)])];
    
    const { data: restaurantsData } = await supabaseAdmin
      .from("restaurants")
      .select("id, name")
      .in("id", allRestaurantIds);
      
    const restaurantMap: Record<string, string> = {};
    (restaurantsData || []).forEach((r) => {
      restaurantMap[r.id] = r.name;
    });

    const formattedPayments = (paymentsData || []).map((p) => {
      let restaurantId = p.subscription_id ? subMap[p.subscription_id] : null;
      if (!restaurantId && p.user_id) {
        restaurantId = userToRestaurantMap[p.user_id];
      }
      const restaurantName = restaurantId ? restaurantMap[restaurantId] : "Unknown Restaurant";
      
      // The DB stores in Rupee (p.amount / 100 was used in webhook previously)
      // If p.amount is 999, it should show ₹999.00
      return {
        id: p.id,
        amount: p.amount,
        amountFormatted: `₹${Number(p.amount).toFixed(2)}`,
        currency: p.currency,
        status: p.status,
        paymentMethod: p.payment_method || "N/A",
        razorpayPaymentId: p.razorpay_payment_id,
        description: p.description || "Subscription Payment",
        createdAt: p.created_at,
        restaurantName: restaurantName,
        userId: p.user_id,
      };
    });

    return new Response(
      JSON.stringify({ payments: formattedPayments }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
