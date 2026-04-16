import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Version endpoint — returns the current Vercel Deployment ID.
 * Used by useAutoUpdate to detect when a new deploy is live.
 *
 * Clients poll this every 5 minutes. If the ID changes, they show
 * a "New version available — Update Now" toast.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
    const deploymentId =
        process.env.VERCEL_DEPLOYMENT_ID ||
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
        "local-dev";

    // Cache for 60 seconds on CDN — short enough to detect new deploys quickly,
    // long enough not to hammer the function.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");
    res.setHeader("Content-Type", "application/json");

    return res.status(200).json({
        version: deploymentId,
        timestamp: Date.now(),
    });
}
