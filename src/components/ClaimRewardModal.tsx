import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Gift, Sparkles, Trophy, PartyPopper, Star, Clock, Ticket, Crown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConfettiEffect } from "@/components/ConfettiEffect";
import { cn } from "@/lib/utils";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";

interface ClaimRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
    reward: {
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
    };
  onRewardClaimed?: () => void;
}

export const ClaimRewardModal = ({ isOpen, onClose, reward, onRewardClaimed }: ClaimRewardModalProps) => {
  const [stage, setStage] = useState<"confirm" | "claiming" | "success">("confirm");
  const [claimedRewardId, setClaimedRewardId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStage("confirm");
      setClaimedRewardId(null);
      setShowConfetti(false);
    }
  }, [isOpen]);

  const handleClaim = async () => {
    setStage("claiming");

    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) {
        toast.error("Please log in to claim rewards");
        setStage("confirm");
        return;
      }

      const { userId } = JSON.parse(authData);

      if (reward.isScratchCard) {
        if (!reward.id) {
          toast.error("Missing reward information");
          setStage("confirm");
          return;
        }

        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/claim-scratch-reward`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({
            userId,
            scratchCardId: reward.id,
            action: "redeem",
          }),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result || !result.success) {
          const errMsg = result?.error || `HTTP ${response.status}: Failed to redeem scratch card.`;
          console.error("Scratch redemption logic error:", errMsg);
          toast.error(errMsg);
          setStage("confirm");
          return;
        }

        setClaimedRewardId(reward.id);
        setStage("success");
        setShowConfetti(true);
        return;
      }

      // Logic for standard loyalty reward
      if (!reward.rewardId || !reward.restaurantId) {
        toast.error("Missing reward information");
        setStage("confirm");
        return;
      }

      const { data: result, error } = await supabase.functions.invoke("claim-reward", {
        body: {
          userId,
          rewardId: reward.rewardId,
          restaurantId: reward.restaurantId,
          loyaltyCardId: reward.loyaltyCardId || null,
        },
      });

      if (error) {
        console.error("Supabase function error:", error);
        toast.error("Network error. Please try again.");
        setStage("confirm");
        return;
      }

      if (!result || !result.success) {
        const errMsg = result?.error;
        const safeMsg = typeof errMsg === "string" ? errMsg : "Failed to claim reward. Please try again.";
        console.error("Standard redemption logic error:", errMsg);
        toast.error(safeMsg);
        setStage("confirm");
        return;
      }

      setClaimedRewardId(result.claimedRewardId || null);
      setStage("success");
      setShowConfetti(true);
    } catch (error: unknown) {
      console.error("Claim error:", error);
      toast.error("Failed to claim reward");
      setStage("confirm");
    }
  };

  const handleClose = () => {
    setStage("confirm");
    setClaimedRewardId(null);
    setShowConfetti(false);
    onClose();
    onRewardClaimed?.();
  };

  // ─── Scratch Card variant ────────────────────────────────────────────
  if (reward.isScratchCard) {
    return (
      <>
        <ConfettiEffect isActive={showConfetti} duration={5000} />
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm mx-auto p-0 border-0 bg-transparent rounded-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden scrollbar-hide shadow-none">
            <div className="sr-only">
              <DialogTitle>Scratch Card Reward</DialogTitle>
              <DialogDescription>Redeem your scratch card winning</DialogDescription>
            </div>

            <AnimatePresence mode="wait">
              {/* ───── SCRATCH CONFIRM ───── */}
              {stage === "confirm" && (
                <motion.div
                  key="scratch-confirm"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="relative overflow-hidden rounded-3xl"
                >
                  {/* Gold shimmer background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500" />
                  <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 45%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.6) 55%, transparent 60%)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Floating sparkles */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-white/30"
                      style={{
                        left: `${8 + Math.random() * 84}%`,
                        top: `${8 + Math.random() * 84}%`,
                      }}
                      animate={{
                        opacity: [0, 0.6, 0],
                        scale: [0.5, 1.2, 0.5],
                        rotate: [0, 180],
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                      }}
                    >
                      <Sparkles className="h-3 w-3" />
                    </motion.div>
                  ))}

                  {/* Content */}
                  <div className="relative z-10 px-5 pt-6 pb-5">
                    {/* Top badge */}
                    <div className="flex items-center justify-between mb-3">
                      <motion.div
                        className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Ticket className="h-3 w-3 text-white" />
                        <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">Scratch Win</span>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                      >
                        <Crown className="h-6 w-6 text-white drop-shadow-lg" />
                      </motion.div>
                    </div>

                    {/* Winner banner */}
                    <motion.div
                      className="text-center mb-3"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                    >
                      <h2 className="text-[28px] font-black text-white drop-shadow-md tracking-tight leading-none mb-0.5">
                        🎉 YOU WON!
                      </h2>
                      <p className="text-white/80 text-[11px] font-semibold">
                        from {reward.restaurantName}
                      </p>
                    </motion.div>

                    {/* Prize card */}
                    <motion.div
                      className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/50 mb-4"
                      initial={{ scale: 0.85, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 250, delay: 0.25 }}
                    >
                      {/* Prize image */}
                      {reward.imageUrl ? (
                        <div className="w-full h-28 rounded-xl overflow-hidden mb-3 border border-amber-200/50 shadow-inner">
                          <img src={reward.imageUrl} alt={reward.rewardName} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-full h-20 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mb-3 border border-amber-200/40">
                          <span className="text-5xl">{reward.icon}</span>
                        </div>
                      )}

                      {/* Prize details */}
                      <div className="text-center">
                        <h3 className="text-xl font-extrabold text-gray-900 mb-1 leading-tight">{reward.rewardName}</h3>
                        {reward.description && (
                          <p className="text-[12px] text-gray-500 font-medium mb-2">{reward.description}</p>
                        )}
                        {reward.expiresAt ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 rounded-full py-0.5 px-2.5 animate-pulse">
                            <Clock className="h-2.5 w-2.5" />
                            Expires {new Date(reward.expiresAt).toLocaleDateString()}
                          </div>
                        ) : reward.expiryDays ? (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full py-0.5 px-2.5">
                            <Clock className="h-2.5 w-2.5" />
                            Valid for {reward.expiryDays} days
                          </div>
                        ) : null}
                      </div>
                    </motion.div>

                    {/* Dashed border separator */}
                    <div className="border-t-2 border-dashed border-white/30 mb-4 mx-2" />

                    {/* CTA */}
                    <motion.div
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <button
                        onClick={handleClaim}
                        className="w-full h-13 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-extrabold text-[15px] uppercase tracking-wider shadow-xl shadow-black/30 active:scale-[0.97] transition-all flex items-center justify-center gap-2.5"
                      >
                        <Zap className="h-5 w-5" />
                        REDEEM NOW
                      </button>
                      <p className="text-[10px] text-white/70 text-center mt-2.5 px-3 leading-relaxed font-medium">
                        Show this screen to the merchant to claim your prize
                      </p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClose();
                        }}
                        className="w-full text-[13px] font-bold text-white/80 py-2 mt-1 active:scale-95 transition-transform hover:text-white"
                      >
                        Maybe Later
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* ───── SCRATCH CLAIMING ───── */}
              {stage === "claiming" && (
                <motion.div
                  key="scratch-claiming"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative overflow-hidden rounded-3xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400" />

                  {/* Animated rings */}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1/2 left-1/2 rounded-full border-2 border-white/20"
                      style={{ transform: "translate(-50%, -50%)" }}
                      animate={{
                        width: [60, 200 + i * 60],
                        height: [60, 200 + i * 60],
                        opacity: [0.6, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                        ease: "easeOut",
                      }}
                    />
                  ))}

                  <div className="relative z-10 px-6 py-20 text-center">
                    <motion.div
                      className="mx-auto w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 border-2 border-white/30"
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.15, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Trophy className="h-12 w-12 text-white drop-shadow-lg" />
                    </motion.div>

                    <motion.h2
                      className="text-xl font-extrabold text-white mb-1.5 drop-shadow-md"
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Claiming your prize...
                    </motion.h2>
                    <p className="text-sm text-white/70 font-medium">
                      ✨ Hold tight, magic is happening!
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ───── SCRATCH SUCCESS ───── */}
              {stage === "success" && (
                <motion.div
                  key="scratch-success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative overflow-hidden rounded-3xl"
                >
                  {/* Dark premium background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

                  {/* Gold shimmer overlay */}
                  <motion.div
                    className="absolute inset-0 opacity-20"
                    style={{
                      background:
                        "linear-gradient(105deg, transparent 35%, rgba(255,215,0,0.4) 45%, rgba(255,215,0,0.7) 50%, rgba(255,215,0,0.4) 55%, transparent 65%)",
                      backgroundSize: "250% 100%",
                    }}
                    animate={{ backgroundPosition: ["250% 0", "-250% 0"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Sparkle particles */}
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${5 + Math.random() * 90}%`,
                        top: `${5 + Math.random() * 90}%`,
                      }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1.5 + Math.random() * 1.5,
                        repeat: Infinity,
                        delay: Math.random() * 3,
                      }}
                    >
                      <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                    </motion.div>
                  ))}

                  <div className="relative z-10 px-5 pt-5 pb-5">
                    {/* Close button */}
                    <button
                      onClick={handleClose}
                      className="absolute right-4 top-4 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center z-20 backdrop-blur-sm"
                    >
                      <X className="h-4 w-4 text-white/70" />
                    </button>

                    {/* Trophy burst */}
                    <motion.div
                      className="relative mx-auto w-20 h-20 mb-3"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    >
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
                        <Trophy className="h-10 w-10 text-white drop-shadow-lg" />
                      </div>
                      {/* Glowing ring */}
                      <motion.div
                        className="absolute -inset-2 rounded-full border-2 border-amber-400/40"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      {/* Star burst */}
                      {Array.from({ length: 8 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{ left: "50%", top: "50%" }}
                          initial={{ scale: 0, x: 0, y: 0 }}
                          animate={{
                            scale: [0, 1, 0],
                            x: Math.cos((i * 45 * Math.PI) / 180) * 50,
                            y: Math.sin((i * 45 * Math.PI) / 180) * 50,
                          }}
                          transition={{ delay: 0.4 + i * 0.05, duration: 0.7 }}
                        >
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Winner text */}
                    <motion.div
                      className="text-center mb-3"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                    >
                      <h2 className="text-[22px] font-black text-white mb-0.5 tracking-tight">
                        🏆 WINNER!
                      </h2>
                      <p className="text-amber-300/80 text-[11px] font-semibold">
                        Your scratch card prize is confirmed
                      </p>
                    </motion.div>

                    {/* Golden ticket prize card */}
                    <motion.div
                      className="relative rounded-2xl overflow-hidden mb-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      {/* Gold border glow */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-[2px]">
                        <div className="w-full h-full rounded-2xl bg-gray-900" />
                      </div>

                      <div className="relative z-10 p-4">
                        {/* Ticket perforated edge effect */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30 overflow-hidden">
                            {reward.imageUrl ? (
                              <img src={reward.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-2xl">{reward.icon}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-amber-400 uppercase tracking-[0.15em] font-bold">
                              {reward.restaurantName}
                            </p>
                            <h3 className="text-[17px] font-extrabold text-white leading-tight">
                              {reward.rewardName}
                            </h3>
                            {reward.description && (
                              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{reward.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Dashed separator */}
                        <div className="border-t border-dashed border-amber-500/30 my-2.5" />

                        {/* Status & ID row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Confirmed</span>
                          </div>

                          {claimedRewardId && (
                            <span className="text-[9px] text-amber-400/60 font-mono font-bold">
                              #{claimedRewardId.slice(0, 8).toUpperCase()}
                            </span>
                          )}

                          {reward.expiresAt ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-red-400" />
                              <span className="text-[9px] font-bold text-red-400">
                                Exp {new Date(reward.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          ) : reward.expiryDays ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-amber-400" />
                              <span className="text-[9px] font-bold text-amber-400">
                                {reward.expiryDays}d left
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </motion.div>

                    {/* Show to staff instruction */}
                    <motion.div
                      className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <p className="text-[12px] font-bold text-amber-300">
                        📱 Show this screen to staff
                      </p>
                      <p className="text-[10px] text-amber-300/60 mt-0.5">
                        They'll verify and hand over your prize!
                      </p>
                    </motion.div>

                    {/* Done button */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.85 }}
                    >
                      <Button
                        className="w-full h-12 rounded-2xl text-[14px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/25 active:scale-[0.97] transition-all"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleClose();
                        }}
                      >
                        Done
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ─── Standard Stamp Reward variant ───────────────────────────────────
  return (
    <>
      <ConfettiEffect isActive={showConfetti} duration={4000} />
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm mx-auto p-0 border-0 bg-card rounded-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="sr-only">
            <DialogTitle>Claim Reward</DialogTitle>
            <DialogDescription>Claim your reward and show it to the merchant</DialogDescription>
          </div>
          
          <AnimatePresence mode="wait">
            {/* Confirm Stage */}
            {stage === "confirm" && (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Header with gradient */}
                <div className="gradient-primary rounded-b-[20px] px-6 pt-5 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-white">
                        Redeem Reward
                      </h2>
                      <p className="text-white/70 text-[10px] mt-0.5">Confirm and show this to the merchant</p>
                    </div>
                  </div>
                </div>

                {/* Reward card - overlapping header */}
                <div className="px-5 -mt-5 relative z-10">
                  <motion.div 
                    className="bg-card rounded-2xl shadow-card p-3 text-center border border-border/40"
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <p className="text-[10px] text-primary uppercase tracking-[0.15em] font-bold">
                        {reward.restaurantName}
                      </p>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1 leading-tight">{reward.rewardName}</h3>
                    {reward.description && (
                      <p className="text-[12px] text-muted-foreground font-medium mb-3">{reward.description}</p>
                    )}
                    
                    {/* Reward image */}
                    <div className="mx-auto w-full max-h-32 aspect-video rounded-xl overflow-hidden mb-3 border border-border/40 bg-muted relative">
                      {reward.imageUrl ? (
                        <img src={reward.imageUrl} alt={reward.rewardName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-5xl">
                          {reward.icon}
                        </div>
                      )}
                    </div>

                    {reward.expiresAt ? (
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 rounded-full py-1 px-3 mb-1 animate-pulse">
                        <Clock className="h-3 w-3" />
                        Expires on {new Date(reward.expiresAt).toLocaleDateString()}
                      </div>
                    ) : reward.expiryDays ? (
                      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 rounded-full py-1 px-3 mb-1">
                        <Clock className="h-3 w-3" />
                        Valid for {reward.expiryDays} days
                      </div>
                    ) : null}
                  </motion.div>
                </div>

                {/* Buttons */}
                <div className="px-5 pt-4 pb-6 space-y-3">
                  <Button 
                    className="w-full h-12 text-sm font-bold rounded-2xl uppercase tracking-wider shadow-lg shadow-primary/20"
                    variant="hero"
                    onClick={handleClaim}
                  >
                    CLAIM REWARD
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed">
                    Please show this screen to the merchant to scan and complete your redemption.
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="w-full text-sm font-bold text-[#800000] py-2 active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Claiming Stage */}
            {stage === "claiming" && (
              <motion.div 
                key="claiming"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 py-16 text-center relative overflow-hidden"
              >
                {/* Background glow */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                {/* Spinning gift */}
                  <motion.div
                    className="relative mx-auto w-24 h-24 rounded-3xl gradient-primary shadow-glow flex items-center justify-center mb-6"
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Gift className="h-12 w-12 text-primary-foreground" />
                  
                  {/* Sparkles around */}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        left: "50%",
                        top: "50%",
                      }}
                      animate={{
                        x: [0, Math.cos((i * 60 * Math.PI) / 180) * 50],
                        y: [0, Math.sin((i * 60 * Math.PI) / 180) * 50],
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    >
                      <Sparkles className="h-4 w-4 text-primary" />
                    </motion.div>
                  ))}
                </motion.div>
                
                <motion.h2 
                  className="text-xl font-bold text-foreground mb-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Unwrapping your reward...
                </motion.h2>
                <p className="text-sm text-muted-foreground">
                  ✨ Something special is coming!
                </p>
              </motion.div>
            )}

            {/* Success Stage */}
            {stage === "success" && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 relative overflow-hidden"
              >
                {/* Background celebration */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-yellow-500/10" />
                
                {/* Close button */}
                <button 
                  onClick={handleClose}
                  className="absolute right-4 top-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>

                {/* Trophy animation */}
                <motion.div 
                  className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 shadow-glow flex items-center justify-center mb-4"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {/* Glow ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-yellow-300/50"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    <PartyPopper className="h-12 w-12 text-white drop-shadow-lg" />
                  </motion.div>
                  
                  {/* Stars burst */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        x: Math.cos((i * 45 * Math.PI) / 180) * 60,
                        y: Math.sin((i * 45 * Math.PI) / 180) * 60,
                      }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.8 }}
                    >
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-xl font-bold text-foreground text-center mb-1">
                    🎉 You Won!
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Congratulations! Show this to claim
                  </p>
                </motion.div>

                {/* Reward details */}
                <motion.div 
                  className="bg-gradient-to-br from-green-500/20 via-green-500/10 to-emerald-500/5 border-2 border-green-500/30 rounded-2xl p-4 mb-3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center text-xl overflow-hidden shadow-soft border border-border/20">
                      {reward.imageUrl ? (
                        <img src={reward.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        reward.icon
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-green-600 dark:text-green-400 uppercase tracking-wider font-bold">
                        {reward.restaurantName}
                      </p>
                      <h3 className="text-[15px] font-bold text-foreground leading-tight">
                        {reward.rewardName}
                      </h3>
                      {reward.description && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{reward.description}</p>
                      )}
                      {reward.expiresAt ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5 text-red-600" />
                          <p className="text-[10px] font-bold text-red-600 uppercase">
                            Expires on {new Date(reward.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      ) : reward.expiryDays ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5 text-amber-600" />
                          <p className="text-[10px] font-bold text-amber-600 uppercase">
                            Expires in {reward.expiryDays} Days
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  {claimedRewardId && (
                    <div className="bg-green-500/10 rounded-lg px-2 py-1 text-center">
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-mono font-bold">
                        Reward ID: {claimedRewardId.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Instructions */}
                <motion.div 
                  className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="text-xs font-bold text-foreground">
                    👆 Show this screen to the staff
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    They'll confirm and hand over your reward!
                  </p>
                </motion.div>

                {/* Done button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  <Button 
                    className="w-full h-12 rounded-xl text-base font-bold active:scale-95 transition-transform"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClose();
                    }}
                  >
                    Done
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};
