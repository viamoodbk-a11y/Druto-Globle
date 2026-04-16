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
        const body = await req.json();
        const { restaurantId } = body;
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
                    userId = user.id;
                }
            } catch (e) {
                console.warn("Could not verify JWT in check-push-receipts");
            }
        }

        if (!restaurantId || !userId) {
            return new Response(JSON.stringify({ error: "Restaurant ID and User ID are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 1. Find campaigns that have status 'sent' and have ticket_ids
        const { data: campaigns, error: campaignsError } = await supabaseAdmin
            .from("notification_campaigns")
            .select("id, ticket_ids, sent_count")
            .eq("restaurant_id", restaurantId)
            .eq("status", "sent")
            .neq("ticket_ids", "[]")
            .order("created_at", { ascending: false })
            .limit(5); // Process last 5 campaigns

        if (campaignsError) throw campaignsError;

        if (!campaigns || campaigns.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No campaigns need syncing" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const results = [];

        for (const campaign of campaigns) {
            const allTicketIds = campaign.ticket_ids || [];
            if (allTicketIds.length === 0) continue;

            // Separate Expo and FCM tickets
            const expoTicketIds = allTicketIds
                .filter(id => id.startsWith('expo:') || !id.includes(':'))
                .map(id => id.startsWith('expo:') ? id.substring(5) : id);

            const fcmTicketIds = allTicketIds.filter(id => id.startsWith('fcm:'));

            console.log(`Checking receipts for campaign ${campaign.id}: ${expoTicketIds.length} Expo, ${fcmTicketIds.length} FCM`);

            let delivered = fcmTicketIds.length; // FCM v1 messages are considered delivered once accepted
            let failed = 0;
            let receiptsProcessed = fcmTicketIds.length;

            if (expoTicketIds.length > 0) {
                try {
                    const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ ids: expoTicketIds }),
                    });

                    if (response.ok) {
                        const receiptData = await response.json();
                        const receipts = receiptData.data || {};

                        Object.keys(receipts).forEach(id => {
                            const receipt = receipts[id];
                            receiptsProcessed++;
                            if (receipt.status === 'ok') {
                                delivered++;
                            } else if (receipt.status === 'error') {
                                failed++;
                                console.error(`Expo delivery error for ticket ${id}:`, receipt.details);
                            }
                        });
                    } else {
                        console.error(`Expo receipts API error: ${await response.text()}`);
                    }
                } catch (err) {
                    console.error("Error fetching Expo receipts:", err);
                }
            }

            console.log(`Campaign ${campaign.id} summary: ${delivered} delivered, ${failed} failed`);

            // Update the database
            const { error: updateError } = await supabaseAdmin
                .from("notification_campaigns")
                .update({
                    delivered_count: delivered,
                    failed_count: failed,
                    status: (receiptsProcessed >= campaign.sent_count) ? 'completed' : 'sent'
                })
                .eq("id", campaign.id);

            if (updateError) console.error("Update error:", updateError);

            results.push({
                campaignId: campaign.id,
                delivered,
                failed,
                totalTickets: allTicketIds.length,
                receiptsProcessed
            });
        }

        return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Internal error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
