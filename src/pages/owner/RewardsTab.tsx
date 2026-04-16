import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Gift, Check, Clock, Phone, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ClaimedReward {
  id: string;
  rewardName: string;
  rewardDescription: string | null;
  rewardImageUrl: string | null;
  stampsRequired: number;
  customerPhone: string;
  claimedAt: string;
  redeemedAt: string | null;
  expiresAt: string | null;
  isRedeemed: boolean;
  isExpired: boolean;
}

interface ScratchCardReward {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  rewardTitle: string;
  rewardDescription: string | null;
  rewardImageUrl: string | null;
  status: string;
  claimedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

interface RewardsTabProps {
  claimedRewards: ClaimedReward[];
  scratchCardRewards?: ScratchCardReward[];
  restaurantName?: string;
  refetch: () => void;
}

export const RewardsTab = ({ claimedRewards, scratchCardRewards = [], restaurantName, refetch }: RewardsTabProps) => {
  const { toast } = useToast();
  const [rewardFilter, setRewardFilter] = useState<"pending" | "redeemed" | "all" | "scratch">("pending");
  const [processingRewardId, setProcessingRewardId] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);

  const filteredClaimedRewards = (() => {
    if (rewardFilter === "pending") {
      return claimedRewards.filter((cr) => !cr.isRedeemed && !cr.isExpired);
    } else if (rewardFilter === "redeemed") {
      return claimedRewards.filter((cr) => cr.isRedeemed);
    }
    return claimedRewards;
  })();

  useMemo(() => setDisplayLimit(20), [rewardFilter]);

  const handleManageReward = async (claimedRewardId: string, action: "accept" | "decline") => {
    const authData = localStorage.getItem("druto_auth");
    if (!authData) return;

    const { userId } = JSON.parse(authData);
    setProcessingRewardId(claimedRewardId);

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/manage-claimed-reward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ claimedRewardId, ownerId: userId, action }),
        }
      );

      const result = await response.json();

      if (result?.success) {
        toast({
          title: action === "accept" ? "Reward Accepted! 🎉" : "Reward Declined",
          description: action === "accept"
            ? "The customer's reward has been confirmed"
            : "The customer can try to claim again",
        });
        refetch();
      } else {
        toast({
          title: "Error",
          description: result?.error || `Failed to ${action} reward`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} reward`,
        variant: "destructive",
      });
    } finally {
      setProcessingRewardId(null);
    }
  };

  const handleManageScratchReward = async (scratchId: string, action: "accept" | "decline") => {
    const authData = localStorage.getItem("druto_auth");
    if (!authData) return;

    const { userId } = JSON.parse(authData);
    setProcessingRewardId(scratchId);

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/claim-scratch-reward`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
          },
          body: JSON.stringify({ userId, scratchCardId: scratchId, action }),
        }
      );

      const result = await response.json();

      if (result && result.success) {
        toast({
          title: action === "accept" ? "Scratch Reward Accepted! 🎉" : "Scratch Reward Declined",
          description: action === "accept"
            ? "The customer's scratch card reward has been confirmed"
            : "The scratch card reward has been declined",
        });
        refetch();
      } else {
        toast({
          title: "Error",
          description: result?.error || `Failed to ${action} scratch reward`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} scratch reward`,
        variant: "destructive",
      });
    } finally {
      setProcessingRewardId(null);
    }
  };

  const pendingCount = claimedRewards.filter(cr => !cr.isRedeemed && !cr.isExpired).length;
  const redeemedCount = claimedRewards.filter(cr => cr.isRedeemed).length;
  const scratchPendingCount = scratchCardRewards.filter(s => s.status === "redeeming").length;

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
        <div className="flex gap-3">
          <Gift className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-[13px]">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Claimed Rewards Only</p>
            <p className="text-blue-700 dark:text-blue-300">
              QR scanning is automatic (no approval needed). This tab shows only <strong>claimed rewards</strong> - when a customer completes their stamps and claims a reward, accept it here when giving them the reward.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "pending", label: "Pending", count: pendingCount },
          { key: "redeemed", label: "Redeemed", count: redeemedCount },
          ...(scratchCardRewards.length > 0 && restaurantName?.toLowerCase().includes("borcella") ? [{ key: "scratch", label: "🎰 Scratch Wins", count: scratchPendingCount }] : []),
          { key: "all", label: "All", count: claimedRewards.length },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => setRewardFilter(filter.key as typeof rewardFilter)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap",
              rewardFilter === filter.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
            <span className={cn(
              "text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
              rewardFilter === filter.key
                ? "bg-primary-foreground/20"
                : "bg-muted-foreground/20"
            )}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Rewards List */}
      <div className="space-y-3">
        {rewardFilter === "scratch" ? (
          /* Scratch Card Rewards */
          scratchCardRewards.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center">
              <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground mb-2">No scratch card wins yet</h3>
              <p className="text-[13px] text-muted-foreground">
                Customer scratch card wins will appear here
              </p>
            </div>
          ) : (
            scratchCardRewards.slice(0, displayLimit).map((sr) => (
              <div
                key={sr.id}
                className={cn(
                  "rounded-2xl bg-card p-4 shadow-soft border border-muted/20",
                  sr.status === "accepted" && "opacity-75"
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-500">
                        {sr.rewardImageUrl ? (
                          <img src={sr.rewardImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xl">🎰</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-[16px] truncate leading-tight">
                          {sr.rewardTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span className="font-medium">{sr.customerPhone}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">• {sr.customerName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {sr.status === "accepted" && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-green-500/20">
                          ACCEPTED
                        </span>
                      )}
                      {sr.status === "declined" && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-500/20">
                          DECLINED
                        </span>
                      )}
                      {sr.status === "redeeming" && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-primary/20 animate-pulse">
                          REDEEMING
                        </span>
                      )}
                      {sr.status === "claimed" && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-500/20">
                          IN WALLET
                        </span>
                      )}
                      {sr.status === "pending" && (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-muted/20">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {sr.rewardDescription && (
                    <div className="bg-muted/30 rounded-xl p-3 text-[13px] text-muted-foreground leading-relaxed">
                      <p className="font-medium text-foreground/80 mb-0.5 text-[11px] uppercase tracking-wide">Scratch Reward:</p>
                      {sr.rewardDescription}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Won: {sr.createdAt}
                      {sr.claimedAt && <> • Claimed: {sr.claimedAt}</>}
                      {sr.acceptedAt && <> • Accepted: {sr.acceptedAt}</>}
                    </p>

                    {sr.status === "redeeming" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleManageScratchReward(sr.id, "decline")}
                          disabled={processingRewardId === sr.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 px-3 text-[13px] font-semibold"
                        >
                          {processingRewardId === sr.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Decline"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleManageScratchReward(sr.id, "accept")}
                          disabled={processingRewardId === sr.id}
                          className="bg-green-600 hover:bg-green-700 h-9 px-5 text-[13px] font-bold rounded-full shadow-sm"
                        >
                          {processingRewardId === sr.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          /* Regular Claimed Rewards */
          filteredClaimedRewards.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center">
              <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground mb-2">
                {rewardFilter === "pending" ? "No pending rewards" :
                  rewardFilter === "redeemed" ? "No redeemed rewards yet" : "No rewards yet"}
              </h3>
              <p className="text-[13px] text-muted-foreground">
                {rewardFilter === "pending"
                  ? "Customers will appear here when they claim their rewards"
                  : "Rewards will appear here as they get redeemed"}
              </p>
            </div>
          ) : (
            filteredClaimedRewards.slice(0, displayLimit).map((reward) => (
              <div
                key={reward.id}
                className={cn(
                  "rounded-2xl bg-card p-4 shadow-soft border border-muted/20",
                  reward.isRedeemed && "opacity-75 grayscale-[0.2]"
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 overflow-hidden",
                        reward.isRedeemed
                          ? "bg-green-500/10"
                          : reward.isExpired
                            ? "bg-red-500/10"
                            : "bg-primary/10"
                      )}>
                        {reward.isRedeemed ? (
                          <Check className="h-6 w-6 text-green-600" />
                        ) : reward.isExpired ? (
                          <Clock className="h-6 w-6 text-red-500" />
                        ) : reward.rewardImageUrl ? (
                          <img src={reward.rewardImageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Gift className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-[16px] truncate leading-tight">
                          {reward.rewardName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mr-1">
                            <Phone className="h-3 w-3" />
                            <span className="font-medium">{reward.customerPhone}</span>
                          </div>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                            <Check className="h-2.5 w-2.5" />
                            <span>{reward.stampsRequired} STAMPS</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {reward.isRedeemed && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-green-500/20">
                          REDEEMED
                        </span>
                      )}
                      {reward.isExpired && !reward.isRedeemed && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-500/20">
                          EXPIRED
                        </span>
                      )}
                      {!reward.isRedeemed && !reward.isExpired && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-primary/20">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Offer Details */}
                  {reward.rewardDescription && (
                    <div className="bg-muted/30 rounded-xl p-3 text-[13px] text-muted-foreground leading-relaxed">
                      <p className="font-medium text-foreground/80 mb-0.5 text-[11px] uppercase tracking-wide">Offer Detail:</p>
                      {reward.rewardDescription}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Claimed: {reward.claimedAt}
                      {reward.isRedeemed && reward.redeemedAt && (
                        <> • Redeemed: {reward.redeemedAt}</>
                      )}
                      {!reward.isRedeemed && reward.expiresAt && (
                        <> • Expires: {new Date(reward.expiresAt).toLocaleDateString()}</>
                      )}
                    </p>

                    {!reward.isRedeemed && !reward.isExpired && (
                      <div className="flex items-center gap-2">
                         <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleManageReward(reward.id, "decline")}
                          disabled={processingRewardId === reward.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 px-3 text-[13px] font-semibold"
                        >
                          {processingRewardId === reward.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Decline"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleManageReward(reward.id, "accept")}
                          disabled={processingRewardId === reward.id}
                          className="bg-green-600 hover:bg-green-700 h-9 px-5 text-[13px] font-bold rounded-full shadow-sm"
                        >
                          {processingRewardId === reward.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {((rewardFilter !== "scratch" && filteredClaimedRewards.length > displayLimit) || 
          (rewardFilter === "scratch" && scratchCardRewards.length > displayLimit)) && (
          <Button
            variant="ghost"
            className="w-full mt-2 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => setDisplayLimit(d => d + 20)}
          >
            Load More
          </Button>
        )}
      </div>
    </div>
  );
};
