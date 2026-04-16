import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Gift, PartyPopper, X, Sparkles } from "lucide-react";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";

interface ScratchCardProps {
  isVisible: boolean;
  scratchData: {
    id: string;
    won: boolean;
    rewardTitle: string | null;
    rewardDescription: string | null;
    rewardImageUrl: string | null;
  };
  restaurantName: string;
  onComplete: () => void;
}

export const ScratchCard = ({ isVisible, scratchData, restaurantName, onComplete }: ScratchCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const CARD_WIDTH = 300;
  const CARD_HEIGHT = 320;
  const REVEAL_THRESHOLD = 0.55;

  // Scratch coating setup
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;

    // Create metallic scratch coating
    const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    gradient.addColorStop(0, "#C0C0C0");
    gradient.addColorStop(0.3, "#E8E8E8");
    gradient.addColorStop(0.5, "#D4D4D4");
    gradient.addColorStop(0.7, "#B0B0B0");
    gradient.addColorStop(1, "#A0A0A0");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // Add subtle texture
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * CARD_WIDTH;
      const y = Math.random() * CARD_HEIGHT;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Add "SCRATCH HERE" text
    ctx.font = "bold 22px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(80, 80, 80, 0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ SCRATCH HERE ✨", CARD_WIDTH / 2, CARD_HEIGHT / 2);

    ctx.font = "14px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
    ctx.fillText("Use your finger to scratch", CARD_WIDTH / 2, CARD_HEIGHT / 2 + 30);

    setIsRevealed(false);
    setScratchPercent(0);
  }, [isVisible]);

  const calculateScratchPercent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;

    const imageData = ctx.getImageData(0, 0, CARD_WIDTH, CARD_HEIGHT);
    const pixels = imageData.data;
    let transparent = 0;
    const total = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    return transparent / total;
  }, []);

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";

    if (lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = 45;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    lastPosRef.current = { x, y };

    const percent = calculateScratchPercent();
    setScratchPercent(percent);

    if (percent >= REVEAL_THRESHOLD && !isRevealed) {
      setIsRevealed(true);
      // Clear the rest of the canvas with animation
      ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    }
  }, [isRevealed, calculateScratchPercent]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CARD_WIDTH / rect.width;
    const scaleY = CARD_HEIGHT / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPosRef.current = null;
    const pos = getPos(e);
    scratch(pos.x, pos.y);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    scratch(pos.x, pos.y);
  };

  const handleEnd = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const handleClaimNow = async () => {
    if (!scratchData.won || isClaiming) return;

    setIsClaiming(true);
    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) return;
      const { userId } = JSON.parse(authData);

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/claim-scratch-reward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          userId,
          scratchCardId: scratchData.id,
          action: "claim",
        }),
      });

      const result = await response.json();
      if (result.success) {
        setClaimed(true);
      }
    } catch (error) {
      console.error("Error claiming scratch card:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Floating particles for won state */}
      {isRevealed && scratchData.won && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${100 + Math.random() * 20}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2.5}s`,
              }}
            >
              <div
                className={cn(
                  "rounded-full",
                  i % 3 === 0 ? "h-3 w-3" : "h-1.5 w-1.5"
                )}
                style={{
                  backgroundColor: ["#FFD700", "#F59E0B", "#FBBF24", "#FFF", "#FFA500"][i % 5],
                  boxShadow: i % 3 === 0 ? '0 0 10px rgba(255, 215, 0, 0.8)' : 'none'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 z-50 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Card Container */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 animate-in zoom-in-95 duration-500 max-h-screen overflow-y-auto py-8">
        {/* Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-1 mb-2 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider">Scratch & Win</span>
          </div>
          <h2 className="text-xl font-black text-white">{restaurantName}</h2>
        </div>

        {/* Scratch Card */}
        <div
          className={cn(
            "relative rounded-3xl overflow-hidden shadow-2xl shadow-black/50 border-2",
            isRevealed && scratchData.won
              ? "border-yellow-400/50"
              : isRevealed
                ? "border-white/20"
                : "border-white/10"
          )}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        >
          {/* Background — the prize underneath */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-700",
              scratchData.won
                ? "bg-gradient-to-br from-[#FFD700] via-[#F59E0B] to-[#B45309] animate-glow-pulse"
                : "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
            )}
          >
            {scratchData.won ? (
              <div className={cn(
                "flex flex-col items-center gap-3 text-center transition-all duration-700",
                isRevealed ? "scale-100 opacity-100" : "scale-75 opacity-40"
              )}>
                <div className="relative">
                  <div className={cn(
                    "h-32 w-32 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden border-2 shadow-2xl transition-all duration-1000",
                    isRevealed ? "border-white/60 scale-100 rotate-0" : "border-white/20 scale-90 rotate-6"
                  )}>
                    {scratchData.rewardImageUrl ? (
                      <img src={scratchData.rewardImageUrl} className="w-full h-full object-cover" alt="Reward" />
                    ) : (
                      <Trophy className="h-16 w-16 text-white drop-shadow-lg" />
                    )}
                  </div>
                  {isRevealed && (
                    <div className="absolute -top-3 -right-3 animate-bounce">
                      <PartyPopper className="h-10 w-10 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">🎉 YOU WON!</p>
                  <h3 className="text-xl font-black text-white leading-tight mb-1">
                    {((scratchData.rewardTitle || "").toLowerCase().includes("choice") || 
                       (scratchData.rewardTitle || "").toLowerCase().includes("special") || 
                       (scratchData.rewardTitle || "").toLowerCase().includes("surprise") ||
                       (scratchData.rewardTitle || "").toLowerCase().includes("mystery")) && 
                      scratchData.rewardDescription
                      ? scratchData.rewardDescription 
                      : (scratchData.rewardTitle || "Special Prize!")}
                  </h3>
                  {scratchData.rewardDescription && (
                    <p className="text-white/80 text-sm leading-snug mt-1">
                      {scratchData.rewardDescription}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className={cn(
                "flex flex-col items-center gap-3 text-center transition-all duration-700",
                isRevealed ? "scale-100 opacity-100" : "scale-75 opacity-40"
              )}>
                <div className="h-20 w-20 rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="text-5xl">😔</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white/90 leading-tight">Better Luck Next Time!</h3>
                  <p className="text-white/60 text-sm mt-1">
                    Don't worry — scan again for another chance!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Scratch canvas overlay */}
          {!isRevealed && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
            />
          )}
        </div>

        {/* Progress indicator */}
        {!isRevealed && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-32 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(scratchPercent / REVEAL_THRESHOLD * 100, 100)}%` }}
              />
            </div>
            <span className="text-white/40 text-xs font-medium">
              {Math.round(Math.min(scratchPercent / REVEAL_THRESHOLD * 100, 100))}%
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {isRevealed && (
          <div className="w-full max-w-[300px] space-y-3 animate-in slide-in-from-bottom-4 duration-500">
            {scratchData.won && !claimed ? (
              <>
                <Button
                  onClick={handleClaimNow}
                  disabled={isClaiming}
                  className="w-full h-12 rounded-2xl text-base font-black bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-xl shadow-amber-500/30 border-0 active:scale-95 transition-transform"
                >
                  {isClaiming ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Claiming...
                    </span>
                  ) : (
                    <>
                      <Gift className="h-5 w-5 mr-2" />
                      Claim Now
                    </>
                  )}
                </Button>
                <Button
                  onClick={onComplete}
                  variant="ghost"
                  className="w-full h-11 text-white/70 hover:text-white hover:bg-white/10 font-bold active:scale-95 transition-transform"
                >
                  Claim Later
                </Button>
              </>
            ) : claimed ? (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm font-bold border border-green-500/30">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Reward Claimed! Show this to staff.
                </div>
                <Button
                  onClick={onComplete}
                  className="w-full h-12 rounded-2xl font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10"
                >
                  Continue
                </Button>
              </div>
            ) : (
              <Button
                onClick={onComplete}
                className="w-full h-12 rounded-2xl text-base font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 active:scale-95 transition-transform"
              >
                Continue
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
