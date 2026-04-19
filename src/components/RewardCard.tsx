import { cn } from "@/lib/utils";
import { Check, Gift, Flame, Star, Zap, ChevronRight } from "lucide-react";

interface RewardCardProps {
  current: number;
  total: number;
  restaurantName: string;
  rewardDescription: string;
  restaurantLogoUrl?: string | null;
  rewardImageUrl?: string | null;
  rewardItem?: string;
  streak?: number;
  className?: string;
  onClick?: () => void;
}

export const RewardCard = ({
  current,
  total,
  restaurantName,
  rewardDescription,
  restaurantLogoUrl,
  rewardImageUrl,
  rewardItem = "🎁",
  streak = 0,
  className,
  onClick,
}: RewardCardProps) => {
  const stamps = Array.from({ length: total }, (_, i) => i < current);
  const isComplete = current >= total;
  const isAlmostThere = !isComplete && total - current <= 2;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-card border border-border/50 p-4 transition-all duration-300",
        isComplete && "ring-2 ring-primary shadow-glow",
        isAlmostThere && "ring-1 ring-accent/50",
        onClick && "cursor-pointer hover:shadow-lg active:scale-[0.98]",
        className
      )}
    >
      {/* Streak badge */}
      {streak > 0 && (
        <div className="absolute -right-1 -top-1 flex items-center gap-1 rounded-bl-xl bg-accent px-2 py-1">
          <Flame className="h-3 w-3 text-accent-foreground" />
          <span className="text-xs font-bold text-accent-foreground">{streak}</span>
        </div>
      )}

      {/* Header with restaurant name */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl text-2xl transition-transform duration-300",
            isComplete ? "gradient-primary animate-pulse-glow" : "bg-muted",
            isAlmostThere && "animate-float"
          )}
        >
          {restaurantLogoUrl ? (
            <img
              src={restaurantLogoUrl}
              alt={restaurantName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : isComplete ? (
            <Gift className="h-6 w-6 text-primary-foreground" />
          ) : (
            <span>{rewardItem}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{restaurantName}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground truncate block">
              {isComplete ? "Claim your reward!" : `Win: ${rewardDescription}`}
            </span>
          </div>
        </div>
        {onClick && (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Tick stamp grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {stamps.map((filled, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded-lg border-2 flex items-center justify-center transition-all duration-300",
              filled
                ? "border-primary bg-primary/10"
                : "border-muted bg-muted/30",
              index === current - 1 && filled && "animate-stamp"
            )}
          >
            {filled && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </div>
        ))}
      </div>

      {/* Progress text */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isComplete ? (
            <>
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span className="text-sm font-bold text-primary">Reward Ready!</span>
            </>
          ) : isAlmostThere ? (
            <>
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Almost there!</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {current} / {total} visits
            </span>
          )}
        </div>
        
        <span className="text-xs text-muted-foreground">
          {!isComplete && `${total - current} more to go`}
        </span>
      </div>

      {/* Decorative elements */}
      <div className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-primary/5" />
      <div className="absolute -left-4 -top-4 h-12 w-12 rounded-full bg-accent/5" />
    </div>
  );
};
