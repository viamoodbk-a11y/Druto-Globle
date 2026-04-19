import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ClaimRewardModal = lazy(() => import("@/components/ClaimRewardModal").then(module => ({ default: module.ClaimRewardModal })));
const ViewClaimedRewardModal = lazy(() => import("@/components/ViewClaimedRewardModal").then(module => ({ default: module.ViewClaimedRewardModal })));
import { ScratchCard } from "@/components/ScratchCard";
import { useRewardsData } from "@/hooks/useRewardsData";
import { Button } from "@/components/ui/button";
import { RewardsSkeleton } from "@/components/skeletons/RewardsSkeleton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { OptimizedImage } from "@/components/OptimizedImage";

import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";

const Rewards = () => {
  const { availableRewards, claimedRewards, scratchCardWins, isLoading, refetch } = useRewardsData();
  const [claimingScratchId, setClaimingScratchId] = useState<string | null>(null);
  const [showScratchModal, setShowScratchModal] = useState(false);
  const [scratchingCardData, setScratchingCardData] = useState<any>(null);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Realtime is now handled inside useRewardsData hook

  const [selectedReward, setSelectedReward] = useState<{
    id?: string;
    loyaltyCardId?: string;
    restaurantId?: string;
    rewardId?: string;
    restaurantName: string;
    rewardName: string;
    description?: string | null;
    icon: string;
    imageUrl?: string;
    expiryDays?: number;
    expiresAt?: string;
    isScratchCard?: boolean;
  } | null>(null);
  const [viewingClaimedReward, setViewingClaimedReward] = useState<{
    id: string;
    rewardName: string;
    restaurantName: string;
    icon: string;
    imageUrl?: string | null;
    description?: string | null;
    claimedAt: string;
    isRedeemed: boolean;
    expiresAt?: string | null;
  } | null>(null);

  const redeemedRewards = useMemo(() => claimedRewards.filter(r => r.isRedeemed), [claimedRewards]);

  if (isLoading && availableRewards.length === 0 && claimedRewards.length === 0) {
    return <RewardsSkeleton />;
  }

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-background pb-24">
        {/* Header */}
        <div className="gradient-primary rounded-b-[32px] px-5 pb-10 pt-12">
          <h1 className="text-[28px] font-bold text-white mb-1">My Rewards</h1>
          <p className="text-white/70 text-[14px]">Your earned treats and history</p>
        </div>

        {/* Available Rewards */}
        <div className="px-4 mt-4 space-y-4">
          {isLoading ? (
            <RewardsSkeleton />
          ) : availableRewards.length === 0 ? (
            <div className="py-12 text-center bg-card rounded-3xl border border-dashed border-muted-foreground/20 px-6">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                🎁
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">No active rewards</h3>
              <p className="text-muted-foreground text-sm">
                When you complete a stamp card, your reward will appear here to show to the merchant.
              </p>
            </div>
          ) : (
            availableRewards.map((reward, i) => (
              <div
                key={reward.id}
                className={cn(
                  "rounded-[24px] p-5 relative mb-4 transition-all active:scale-[0.98]",
                  reward.isScratchCard 
                    ? "bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-scratch" 
                    : "bg-white border-border/40 shadow-sm border"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] overflow-hidden">
                        {reward.logoUrl ? (
                          <img src={reward.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          reward.icon
                        )}
                      </div>
                      <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-tight">
                        {reward.restaurantName}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                        reward.isScratchCard ? "bg-amber-500 text-white" : "bg-[#22C55E] text-white"
                      )}>
                        {reward.isScratchCard ? "SCRATCH WIN" : "EARNED"}
                      </span>
                    </div>
                    
                    <h3 className={cn(
                      "text-[19px] font-bold leading-tight mb-1",
                      reward.isScratchCard ? "text-amber-900" : "text-[#1A1A19]"
                    )}>
                      {reward.reward}
                    </h3>
                    
                    <p className="text-[13px] text-muted-foreground mb-4">
                      {reward.expiresIn}
                    </p>
                    
                    <Button
                      className={cn(
                        "h-10 px-8 rounded-full text-[14px] font-bold border-0",
                        reward.isScratchCard 
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 shadow-lg" 
                          : "bg-[#800000] hover:bg-[#600000] text-white"
                      )}
                      onClick={() => setSelectedReward({
                        id: reward.isScratchCard ? reward.id : (reward.id.startsWith("unclaimed-") ? undefined : reward.id),
                        loyaltyCardId: reward.loyaltyCardId,
                        restaurantId: reward.restaurantId,
                        rewardId: reward.rewardId,
                        restaurantName: reward.restaurantName,
                        rewardName: reward.reward,
                        description: reward.description,
                        icon: reward.icon,
                        imageUrl: reward.imageUrl || undefined,
                        expiryDays: reward.expiryDays,
                        expiresAt: reward.expiresAt || undefined,
                        isScratchCard: reward.isScratchCard,
                      })}
                    >
                      REDEEM
                    </Button>
                  </div>

                  <div className="w-20 h-20 rounded-full bg-white border border-border/30 overflow-hidden flex-shrink-0 shadow-sm p-1">
                    {reward.imageUrl ? (
                      <img src={reward.imageUrl} alt={reward.reward} className="w-full h-full object-cover rounded-full" />
                    ) : reward.logoUrl ? (
                      <img src={reward.logoUrl} alt={reward.restaurantName} className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl bg-amber-50 rounded-full">
                        {reward.icon}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Scratch Card Wins Section - ONLY FOR BORCELLA */}
        {scratchCardWins.filter(win => win.restaurantName?.toLowerCase().includes("borcella")).length > 0 && (
          <>
            <div className="px-4 mt-8 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">✨ New Scratch Cards</h2>
            </div>

            <div className="px-4 mt-3 space-y-2.5">
              {scratchCardWins.filter(win => win.restaurantName?.toLowerCase().includes("borcella")).map((win) => (
                <div
                  key={win.id}
                  className="rounded-2xl bg-card shadow-soft p-4 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {win.rewardImageUrl ? (
                        <img src={win.rewardImageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🎰</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-bold text-foreground">
                        {win.rewardTitle}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {win.restaurantName} • Won {win.wonAt}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {win.status === "pending" && (
                        <Button
                          size="sm"
                          variant="hero"
                          className="h-8 px-4 rounded-full text-[12px] font-bold shadow-lg shadow-amber-500/20"
                          onClick={() => {
                            setScratchingCardData({
                              id: win.id,
                              won: win.won,
                              rewardTitle: win.rewardTitle,
                              rewardDescription: win.rewardDescription,
                              rewardImageUrl: win.rewardImageUrl,
                              restaurantName: win.restaurantName
                            });
                            setShowScratchModal(true);
                          }}
                        >
                          Scratch
                        </Button>
                      )}
                      {win.status === "claimed" && (
                        <Button
                          size="sm"
                          className="h-8 px-4 rounded-full text-[12px] font-bold bg-[#800000] text-white border-0"
                          onClick={() => setSelectedReward({
                            id: win.id,
                            restaurantId: win.restaurantId,
                            restaurantName: win.restaurantName,
                            rewardName: win.rewardTitle,
                            description: win.rewardDescription,
                            icon: "🎰",
                            imageUrl: win.rewardImageUrl || undefined,
                            isScratchCard: true
                          })}
                        >
                          Redeem
                        </Button>
                      )}
                      {win.status === "redeeming" && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">PENDING</span>
                      )}
                      {win.status === "accepted" && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">REDEEMED</span>
                      )}
                    </div>
                  </div>
                  {win.rewardDescription && (
                    <p className="text-[12px] text-muted-foreground mt-2 pl-[60px]">{win.rewardDescription}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* History Section */}
        {redeemedRewards.length > 0 && (
          <>
            <div className="px-4 mt-8 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-foreground">History</h2>
              <button className="text-[14px] font-bold text-[#800000]">View All</button>
            </div>
            
            <div className="px-4 mt-3 space-y-2.5">
              {redeemedRewards.slice(0, 10).map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setViewingClaimedReward({
                    id: item.id,
                    rewardName: item.reward,
                    restaurantName: item.restaurant,
                    icon: item.icon,
                    imageUrl: item.imageUrl,
                    description: item.description,
                    claimedAt: item.claimedAt,
                    isRedeemed: item.isRedeemed,
                    expiresAt: item.expiresAt,
                  })}
                  className={cn(
                    "w-full rounded-2xl bg-card shadow-soft p-3.5 flex items-center gap-3 text-left transition-all",
                    isLoading ? "opacity-0 animate-slide-up" : "opacity-100",
                    `stagger-${i + 1}`
                  )}
                >
                  {/* Logo */}
                  <div className={cn(
                    "h-11 w-11 rounded-full flex items-center justify-center text-lg flex-shrink-0",
                    item.isScratchCard ? "bg-amber-100 text-amber-600 shadow-sm" : "bg-muted"
                  )}>
                    {item.isScratchCard ? "🎰" : item.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-foreground italic">{item.reward}</h4>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {item.restaurant} • {item.claimedAt}
                    </p>
                  </div>

                  {/* Redeemed badge */}
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider border border-muted-foreground/30 px-2 py-1 rounded">
                    REDEEMED
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </PullToRefresh>

      {/* Claim Modal */}
      {selectedReward && (
        <Suspense fallback={null}>
          <ClaimRewardModal
            isOpen={!!selectedReward}
            onClose={() => setSelectedReward(null)}
            reward={selectedReward}
            onRewardClaimed={refetch}
          />
        </Suspense>
      )}

      {/* View Claimed Reward Modal */}
      {viewingClaimedReward && (
        <Suspense fallback={null}>
          <ViewClaimedRewardModal
            isOpen={!!viewingClaimedReward}
            onClose={() => setViewingClaimedReward(null)}
            reward={viewingClaimedReward}
          />
        </Suspense>
      )}

      {showScratchModal && scratchingCardData && (
        <ScratchCard
          isVisible={showScratchModal}
          scratchData={scratchingCardData}
          restaurantName={scratchingCardData.restaurantName || "Business"}
          onComplete={() => {
            setShowScratchModal(false);
            setScratchingCardData(null);
            handleRefresh();
          }}
        />
      )}
    </>
  );
};

export default Rewards;
