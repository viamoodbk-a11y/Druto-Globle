import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, PartyPopper, Sparkles, X, Clock, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewClaimedRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: {
    id: string;
    rewardName: string;
    restaurantName: string;
    icon: string;
    imageUrl?: string | null;
    description?: string | null;
    claimedAt: string;
    isRedeemed: boolean;
    expiresAt?: string | null;
  };
}

/**
 * Read-only modal for viewing already claimed rewards
 * Shows reward details without claim functionality
 */
export const ViewClaimedRewardModal = ({ isOpen, onClose, reward }: ViewClaimedRewardModalProps) => {
  const isExpired = reward.expiresAt && new Date(reward.expiresAt) < new Date();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm p-0 bg-card border-0 rounded-3xl max-h-[92vh] overflow-y-auto scrollbar-hide">
        <div className="sr-only">
          <DialogTitle>View Claimed Reward</DialogTitle>
          <DialogDescription>Details of your claimed reward</DialogDescription>
        </div>
        <div className="text-center">
          {/* Header */}
          <div className={cn(
            "px-6 py-6 relative overflow-hidden",
            reward.isRedeemed
              ? "gradient-success"
              : isExpired
              ? "bg-muted"
              : "gradient-primary"
          )}>
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center z-10"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            <PartyPopper className="absolute top-4 left-4 h-8 w-8 text-white/30" />
            <PartyPopper className="absolute top-4 right-12 h-8 w-8 text-white/30 scale-x-[-1]" />
            <Sparkles className="absolute bottom-4 left-8 h-6 w-6 text-white/20" />
            <Sparkles className="absolute bottom-4 right-8 h-6 w-6 text-white/20" />
            
            <div className="h-16 w-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden mb-3 shadow-lg border border-white/20">
              {reward.imageUrl ? (
                <img src={reward.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{reward.icon}</span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white px-4 leading-tight">
              {reward.rewardName}
            </h2>
            <p className="text-white/80 text-xs mt-0.5">
              {reward.restaurantName}
            </p>
            {reward.description && reward.description !== reward.rewardName && (
              <p className="text-white/60 text-[10px] mt-1.5 px-6 line-clamp-2">
                {reward.description}
              </p>
            )}
          </div>

          <div className="p-5">
            {/* Status badge */}
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4",
              reward.isRedeemed
                ? "bg-muted text-foreground"
                : isExpired
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}>
              {reward.isRedeemed ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="font-medium">Redeemed Successfully</span>
                </>
              ) : isExpired ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Expired</span>
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4" />
                  <span className="font-medium">Claimed - Ready to Use</span>
                </>
              )}
            </div>

            {/* Reward voucher card */}
            <div className={cn(
              "p-4 rounded-2xl border-4 border-dashed mb-4 relative overflow-hidden",
              reward.isRedeemed
                ? "border-primary/40 bg-muted/30"
                : isExpired
                ? "border-border bg-muted/20"
                : "border-primary bg-gradient-to-br from-primary/5 to-primary/10"
            )}>
              {/* Corner decorations */}
              <div className={cn(
                "absolute top-2 left-2 h-3 w-3 rounded-full",
                reward.isRedeemed ? "bg-primary/30" : isExpired ? "bg-muted" : "bg-primary/30"
              )} />
              <div className={cn(
                "absolute top-2 right-2 h-3 w-3 rounded-full",
                reward.isRedeemed ? "bg-primary/30" : isExpired ? "bg-muted" : "bg-primary/30"
              )} />
              <div className={cn(
                "absolute bottom-2 left-2 h-3 w-3 rounded-full",
                reward.isRedeemed ? "bg-primary/30" : isExpired ? "bg-muted" : "bg-primary/30"
              )} />
              <div className={cn(
                "absolute bottom-2 right-2 h-3 w-3 rounded-full",
                reward.isRedeemed ? "bg-primary/30" : isExpired ? "bg-muted" : "bg-primary/30"
              )} />
              
              <div className="text-4xl mb-2">
                {reward.isRedeemed ? "✅" : isExpired ? "⏰" : "🎁"}
              </div>
              <p className={cn(
                "text-lg font-bold",
                reward.isRedeemed
                  ? "text-primary"
                  : isExpired
                  ? "text-muted-foreground"
                  : "text-primary"
              )}>
                {reward.isRedeemed ? "REDEEMED" : isExpired ? "EXPIRED" : "CLAIMED"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Claimed: {reward.claimedAt}
              </p>
              {reward.expiresAt && !reward.isRedeemed && (
                <p className="text-xs text-muted-foreground mt-1">
                  {isExpired ? "Expired" : "Expires"}: {new Date(reward.expiresAt).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                ID: {reward.id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            {!reward.isRedeemed && !isExpired && (
              <div className="flex items-center justify-center gap-2 text-primary bg-primary/10 rounded-xl py-3 mb-4">
                <Gift className="h-5 w-5" />
                <span className="font-medium">Show this screen to staff</span>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full h-11 text-sm font-bold active:scale-95 transition-transform"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
