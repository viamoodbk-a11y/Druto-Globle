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

    if (!clientEmail || !privateKey) {
        console.error("Missing Firebase Service Account credentials");
        return null;
    }

    try {
        const { JWT } = await import("https://esm.sh/google-auth-library@9.4.1");
        const client = new JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });

        const tokens = await client.authorize();
        return tokens.access_token;
    } catch (error) {
        console.error("Error generating FCM access token:", error);
        return null;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { userId: targetUserId, title, body: messageBody, imageUrl } = body;
        let userId = body.userId; // Default to provided userId

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Try to get sender userId from JWT if provided (more secure)
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user } } = await supabaseAdmin.auth.getUser(token);
                if (user) {
                    userId = user.id;
                }
            } catch (e) {
                console.warn("Could not verify JWT in send-notification");
            }
        }

        if (!targetUserId || !title) {
            return new Response(
                JSON.stringify({ error: "Target User ID and title are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("push_token, device_token, token_type")
            .eq("id", targetUserId)
            .maybeSingle();

        if (error) {
            console.error("Error fetching user profile:", error);
            throw error;
        }

        if (!profile || (!profile.push_token && !profile.device_token)) {
            return new Response(
                JSON.stringify({ error: "User does not have any push tokens registered" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let result: any = null;

        // 1. Try sending via FCM v1 if device_token is available
        if (profile.device_token && (profile.token_type === 'fcm' || profile.token_type === 'apns')) {
            const accessToken = await getFcmAccessToken();
            const fcmProjectId = Deno.env.get("FIREBASE_PROJECT_ID") || "druto---reward";

            if (accessToken) {
                try {
                    const message: any = {
                        message: {
                            token: profile.device_token,
                            notification: { title, body: messageBody },
                            data: {
                                type: "notification"
                            }
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
                        result = await response.json();
                        console.log("FCM send success:", result.name);
                    } else {
                        const errText = await response.text();
                        console.error("FCM send failed:", errText);
                    }
                } catch (fcmErr) {
                    console.error("Error in FCM send block:", fcmErr);
                }
            }
        }

        // 2. Fallback to Expo if FCM didn't run or failed, and expo token is available
        if (!result && profile.push_token) {
            console.log(`Sending to target user ${targetUserId} via Expo (legacy fallback)...`);
            const expoMessage = {
                to: profile.push_token,
                sound: "default",
                title: title,
                body: messageBody,
                data: body.data || {},
            };

            try {
                const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(expoMessage),
                });

                if (expoResponse.ok) {
                    result = await expoResponse.json();
                    console.log("Expo send success:", result);
                } else {
                    const errText = await expoResponse.text();
                    console.error("Expo send failed:", errText);
                }
            } catch (expoErr) {
                console.error("Error in Expo send block:", expoErr);
            }
        }

        if (!result) {
            return new Response(
                JSON.stringify({ error: "Failed to send notification via available channels" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, result }),
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
