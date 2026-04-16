import { memo, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { DrutoLoader } from "@/components/DrutoLoader";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { setCachedData } from "@/lib/queryCache";

interface MainLayoutProps {
  userType?: "customer" | "owner";
}

/**
 * MainLayout - Persistent layout wrapper that mounts ONCE and never remounts.
 * The BottomNav stays mounted while child pages swap via <Outlet>.
 * We've added AnimatePresence and motion.div to create smooth fade-and-scale 
 * transitions between pages for a premium app-like feel.
 */
export const MainLayout = memo(({ userType = "customer" }: MainLayoutProps) => {
  const location = useLocation();
  const queryClient = useQueryClient();

  // OPTIMIZATION: Proactive background fetching for Rewards
  // Triggers 2 seconds after boot to stay out of the way of the critical Dashboard load
  useEffect(() => {
    if (userType !== "customer") return;

    const timer = setTimeout(() => {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;

      try {
        const { userId } = JSON.parse(authData);

        // Fetch rewards data in background
        fetch(`${SUPABASE_FUNCTIONS_URL}/get-rewards-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({ userId }),
        })
          .then((r) => r.json())
          .then((result) => {
            if (result.success) {
              const payload = {
                availableRewards: result.availableRewards || [],
                claimedRewards: result.claimedRewards || [],
              };
              // Seed the React Query cache
              queryClient.setQueryData(["rewards-data"], payload);
              // Seed the localStorage cache
              setCachedData("rewards_data", payload);
            }
          })
          .catch(() => { });
      } catch (e) {
        console.error("Auth parsing error", e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [userType, queryClient]);

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.18,
          ease: [0.23, 1, 0.32, 1]
        }}
        className="min-h-screen"
      >
        <Suspense fallback={<DrutoLoader />}>
          <Outlet />
        </Suspense>
      </motion.div>
      <BottomNav userType={userType} />
    </div>
  );
});

MainLayout.displayName = "MainLayout";

export default MainLayout;
