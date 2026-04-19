import { useState, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const brandEmojis = ["🎁", "☕", "🍕", "✂️", "🏋️", "🛍️", "💇", "🚗", "💎", "🐾"];

export const PullToRefresh = ({ onRefresh, children, className }: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBlasting, setIsBlasting] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Use window scroll position instead of container scroll
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const pullDistanceRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;

    const scrollTop = window.scrollY;
    if (scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && startY.current > 0) {
      const dampedPull = Math.min(diff * 0.5, maxPull);
      pullDistanceRef.current = dampedPull;

      // Use rAF to batch DOM updates and avoid jank
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setPullDistance(pullDistanceRef.current);
          rafRef.current = null;
        });
      }
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistanceRef.current >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setIsBlasting(true);

      // Trigger blast animation
      setTimeout(() => {
        setIsBlasting(false);
      }, 600);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    } else {
      setPullDistance(0);
      pullDistanceRef.current = 0;
    }
    startY.current = 0;
  }, [threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ overscrollBehavior: 'contain' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator with food items */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-opacity duration-200 z-50",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: Math.max(pullDistance, isRefreshing ? 60 : 0),
          top: 0,
        }}
      >
        <div className="relative flex items-center justify-center gap-2">
          {brandEmojis.slice(0, 5).map((emoji, index) => {
            const offset = (index - 2) * 20;
            const delay = index * 0.1;
            const rotation = isBlasting ? (index - 2) * 30 : 0;
            const blastY = isBlasting ? -100 - Math.random() * 50 : 0;
            const blastX = isBlasting ? offset * 2 : 0;

            return (
              <span
                key={index}
                className={cn(
                  "text-2xl transition-all",
                  isRefreshing && !isBlasting && "animate-bounce"
                )}
                style={{
                  transform: `
                    translateY(${isBlasting ? blastY : pullDistance * 0.3}px)
                    translateX(${blastX}px)
                    scale(${0.5 + progress * 0.5})
                    rotate(${isBlasting ? rotation + (Math.random() - 0.5) * 60 : progress * (index - 2) * 10}deg)
                  `,
                  opacity: isBlasting ? 0 : Math.min(1, progress * 1.5),
                  transitionDuration: isBlasting ? "0.6s" : "0.15s",
                  transitionTimingFunction: isBlasting ? "cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "ease-out",
                  animationDelay: `${delay}s`,
                }}
              >
                {emoji}
              </span>
            );
          })}
        </div>

        {/* Status text */}
        <div
          className="absolute bottom-2 text-xs text-muted-foreground font-medium transition-opacity"
          style={{ opacity: pullDistance > 20 && !isBlasting ? 1 : 0 }}
        >
          {isRefreshing ? "Refreshing..." : pullDistance >= threshold ? "Release to refresh" : "Pull to refresh"}
        </div>
      </div>

      {/* Content with transform - only apply when actively pulling */}
      <div
        style={{
          transform: pullDistance > 0 || isRefreshing ? `translate3d(0, ${isRefreshing ? 60 : pullDistance}px, 0)` : "none",
          transition: pullDistance === 0 && !isRefreshing ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : pullDistance > 0 ? "none" : "transform 0.3s ease-out",
          willChange: pullDistance > 0 ? 'transform' : 'auto',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {children}
      </div>

      {/* Blast particles */}
      {isBlasting && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {brandEmojis.map((emoji, index) => {
            const startX = 50 + (Math.random() - 0.5) * 20;
            const endX = startX + (Math.random() - 0.5) * 60;
            const endY = -20 - Math.random() * 30;

            return (
              <span
                key={`blast-${index}`}
                className="absolute text-2xl animate-blast-up"
                style={{
                  left: `${startX}%`,
                  top: "80px",
                  "--end-x": `${endX - startX}vw`,
                  "--end-y": `${endY}vh`,
                  "--rotation": `${(Math.random() - 0.5) * 720}deg`,
                  animationDelay: `${index * 0.05}s`,
                } as React.CSSProperties}
              >
                {emoji}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
