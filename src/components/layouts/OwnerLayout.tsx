import { memo, Suspense, useCallback, useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { DrutoLoader } from "@/components/DrutoLoader";
import { OwnerBottomNav } from "@/components/owner/OwnerBottomNav";
import { useOwnerData } from "@/hooks/useOwnerData";

/**
 * OwnerLayout - Persistent layout for restaurant owner pages.
 * OwnerBottomNav stays mounted while child pages swap via <Outlet>.
 * Uses edge function for pending counts to bypass RLS when Supabase session isn't synced.
 */
export const OwnerLayout = memo(() => {
  const { stats, claimedRewards, refetch: refetchAllData } = useOwnerData();

  const pendingRewardsCount = (claimedRewards || []).filter(
    (cr: any) => !cr.isRedeemed && !cr.isExpired
  ).length;
  const pendingScansCount = stats?.pendingScansCount || 0;

  const refreshCounts = useCallback(() => {
    refetchAllData();
  }, [refetchAllData]);

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <Suspense fallback={<DrutoLoader />}>
        <Outlet context={{ refreshCounts }} />
      </Suspense>
      <OwnerBottomNav
        pendingRewardsCount={pendingRewardsCount}
        pendingScansCount={pendingScansCount}
      />
    </div>
  );
});

OwnerLayout.displayName = "OwnerLayout";

export default OwnerLayout;
