import type { VercelRequest, VercelResponse } from "@vercel/node";

// Warmup route — called every 4 minutes by Vercel Cron
// Prevents cold starts on the 3 most critical Edge Functions
const CRITICAL_FUNCTIONS = [
    "get-customer-data",
    "get-restaurant-detail",
    "process-scan",
    "get-profile",
    "get-rewards-data",
];

const SUPABASE_FUNCTIONS_BASE =
    process.env.VITE_SUPABASE_URL + "/functions/v1";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow cron invocations (Vercel adds this header)
    const authHeader = req.headers["authorization"];
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const results: Record<string, string> = {};

    await Promise.allSettled(
        CRITICAL_FUNCTIONS.map(async (fn) => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3000);
                await fetch(`${SUPABASE_FUNCTIONS_BASE}/${fn}`, {
                    method: "OPTIONS",
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                results[fn] = "warm";
            } catch {
                results[fn] = "timeout_or_error";
            }
        })
    );

    return res.status(200).json({ ok: true, results, ts: new Date().toISOString() });
}
