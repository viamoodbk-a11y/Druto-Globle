import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generates a Google OAuth2 Access Token for FCM v1 using Service Account credentials.
 */
async function getFcmAccessToken() {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID") || "druto---reward";

  console.log(`FCM Auth attempt: email=${clientEmail}, projectId=${projectId}, keyLength=${privateKey?.length}`);

  if (!clientEmail || !privateKey) {
    console.error("Missing Firebase Service Account credentials (email or key is empty)");
    return null;
  }

  try {
    const { JWT } = await import("npm:google-auth-library@9");
    console.log("google-auth-library (npm) imported successfully");
    const client = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    console.log("Starting client.authorize()...");
    const tokens = await client.authorize();
    console.log("FCM authorize successful");
    return tokens.access_token;
  } catch (error) {
    console.error("Error generating FCM access token:", error);
    if (error instanceof Error) {
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { restaurantId, title, body: messageBody, imageUrl, startDate, endDate } = body;
    let userId = body.userId;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Try to get userId from JWT if provided (more secure)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          console.log(`Verified User ID from JWT: ${user.id}`);
          userId = user.id;
        }
      } catch (e) {
        console.warn("Could not verify JWT, falling back to provided userId");
      }
    }

    if (!restaurantId || !userId) {
      return new Response(JSON.stringify({ error: "Restaurant ID and User ID are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Verify that the userId is the owner of the restaurant
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("owner_id")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      return new Response(JSON.stringify({ error: "Restaurant not found", details: restaurantError?.message }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (restaurant.owner_id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized: You are not the owner of this restaurant" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Fetch distinct user_ids from scans for this restaurant with optional date range
    let scansQuery = supabaseAdmin
      .from("scans")
      .select("user_id")
      .eq("restaurant_id", restaurantId);

    if (startDate) {
      scansQuery = scansQuery.gte("scanned_at", new Date(startDate).toISOString());
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      scansQuery = scansQuery.lte("scanned_at", end.toISOString());
    }

    const { data: scans, error: scansError } = await scansQuery;

    if (scansError) {
      console.error("Scans query error:", scansError);
      return new Response(JSON.stringify({ error: "Error fetching customer scans", details: scansError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract unique user IDs and limit to 100 for safety
    const uniqueUserIds = [...new Set(scans.map(s => s.user_id))].slice(0, 100);
    console.log(`Found ${scans.length} total scans, ${uniqueUserIds.length} unique users for restaurant ${restaurantId}`);

    // Create the campaign record early
    let campaignId = null;
    if (title !== "CALCULATE_ONLY") {
      const { data: newCampaign, error: campaignError } = await supabaseAdmin
        .from("notification_campaigns")
        .insert({
          restaurant_id: restaurantId,
          title: title,
          body: messageBody,
          image_url: imageUrl || null,
          sent_count: 0,
          status: 'sending'
        })
        .select("id")
        .single();

      if (campaignError) {
        console.error("Error creating campaign record:", campaignError);
      } else {
        campaignId = newCampaign.id;
        console.log(`Created campaign record with ID: ${campaignId}`);
      }
    }

    if (uniqueUserIds.length === 0) {
      if (campaignId) {
        await supabaseAdmin.from("notification_campaigns").update({ status: 'sent', sent_count: 0 }).eq("id", campaignId);
      }
      return new Response(JSON.stringify({ success: true, sentCount: 0, message: "No customers found for the selected criteria" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Fetch push tokens for these users (Native and Expo)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, push_token, device_token, token_type")
      .in("id", uniqueUserIds);

    if (profilesError) {
      console.error("Profiles query error:", profilesError);
      return new Response(JSON.stringify({ error: "Error fetching push tokens", details: profilesError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Categorize tokens
    const fcmUsers = profiles.filter(p => p.device_token && (p.token_type === 'fcm' || p.token_type === 'apns'));
    const expoUsers = profiles.filter(p => p.push_token && !p.device_token);

    console.log(`Targets: ${fcmUsers.length} Native (FCM/APNs), ${expoUsers.length} Legacy (Expo)`);

    if (fcmUsers.length === 0 && expoUsers.length === 0) {
      if (campaignId) {
        await supabaseAdmin.from("notification_campaigns").update({ status: 'sent', sent_count: 0 }).eq("id", campaignId);
      }
      return new Response(JSON.stringify({ success: true, sentCount: 0, message: "No customers have push tokens enabled" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // DRY-RUN CHECK
    if (title === "CALCULATE_ONLY") {
      return new Response(
        JSON.stringify({ success: true, sentCount: fcmUsers.length + expoUsers.length, message: "Calculated audience size successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSent = 0;
    const ticketIds: string[] = [];
    const fcmProjectId = Deno.env.get("FIREBASE_PROJECT_ID") || "druto---reward";

    // 4a. Send via FCM v1 for Native tokens
    if (fcmUsers.length > 0) {
      const accessToken = await getFcmAccessToken();
      if (accessToken) {
        console.log(`Sending to ${fcmUsers.length} users via FCM v1...`);

        await Promise.all(fcmUsers.map(async (user) => {
          try {
            const message: any = {
              message: {
                token: user.device_token,
                notification: { title, body: messageBody },
                data: {
                  restaurantId: String(restaurantId),
                  campaignId: String(campaignId || ""),
                },
              }
            };

            if (imageUrl) {
              message.message.notification.image = imageUrl;
              message.message.data.imageUrl = imageUrl;
            }

            const response = await fetch(`https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            });

            if (response.ok) {
              const resData = await response.json();
              if (resData.name) {
                totalSent++;
                ticketIds.push(`fcm:${resData.name.split('/').pop()}`);
              }
            } else {
              const errText = await response.text();
              console.error(`FCM error for token ${user.device_token?.substring(0, 10)}...: ${errText}`);
            }
          } catch (err) {
            console.error("Individual FCM send error:", err);
          }
        }));
      } else {
        console.error("FCM integration skipped: Missing credentials or token generation failed");
      }
    }

    // 4b. Send via Expo for Legacy tokens
    if (expoUsers.length > 0) {
      const expoMessages = expoUsers.map(user => ({
        to: user.push_token,
        sound: "default",
        title: title,
        body: messageBody,
        data: { restaurantId, campaignId, imageUrl },
      }));

      try {
        console.log(`Sending to ${expoMessages.length} users via Expo...`);
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(expoMessages),
        });

        if (response.ok) {
          const expoResponse = await response.json();
          if (expoResponse.data) {
            expoResponse.data.forEach((item: any) => {
              if (item.id) {
                ticketIds.push(`expo:${item.id}`);
                totalSent++;
              }
            });
          }
        }
      } catch (expoError) {
        console.error("Legacy Expo send error:", expoError);
      }
    }

    // 5. Update campaign record
    if (campaignId) {
      await supabaseAdmin
        .from("notification_campaigns")
        .update({
          sent_count: totalSent,
          ticket_ids: ticketIds,
          status: 'sent'
        })
        .eq("id", campaignId);
    }

    return new Response(
      JSON.stringify({ success: true, sentCount: totalSent, campaignId, ticketIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Internal server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
