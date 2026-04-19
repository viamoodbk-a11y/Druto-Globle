import { memo } from "react";
import { cn } from "@/lib/utils";
import { Check, Gift, ChevronRight } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface StampCardProps {
  current: number;
  total: number;
  restaurantName: string;
  rewardDescription: string;
  restaurantLogoUrl?: string | null;
  fallbackIcon?: string;
  className?: string;
  onClick?: () => void;
  allRewards?: { stampsRequired: number }[];
}

const StampCard = memo(({
  current,
  total,
  restaurantName,
  rewardDescription,
  restaurantLogoUrl,
  fallbackIcon,
  className,
  onClick,
  allRewards,
}: StampCardProps) => {
  const stamps = Array.from({ length: total }, (_, i) => i < current);
  const isComplete = current >= total;

  // Always use 6 stamps per row
  const stampsPerRow = 6;
  const rows = Math.ceil(total / stampsPerRow);

  // Optimize logo URL with ImageKit (88px = 44px * 2 for retina)
  const optimizedLogoUrl = restaurantLogoUrl
    ? getOptimizedImageUrl(restaurantLogoUrl, 88)
    : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-card shadow-card p-4 transition-all duration-200",
        isComplete && "ring-2 ring-primary",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Restaurant logo */}
          <div className="h-11 w-11 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0 border border-primary/15">
            {optimizedLogoUrl ? (
              <img
                src={optimizedLogoUrl}
                alt={restaurantName}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : fallbackIcon ? (
              <span className="text-xl">{fallbackIcon}</span>
            ) : (
              <span className="text-primary font-bold text-lg">
                {restaurantName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-[15px] font-bold text-foreground leading-tight">{restaurantName}</h3>
            </div>
            <p className="text-[13px] text-primary font-medium line-clamp-1 truncate">
              Win: {rewardDescription}
            </p>
          </div>
        </div>
        {/* Stamps counter */}
        <div className="text-right flex-shrink-0">
          <div>
            <span className="text-lg font-bold text-primary">{current}</span>
            <span className="text-muted-foreground text-sm">/{total}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Stamps</p>
        </div>
      </div>

      {/* Stamp Grid with arrow */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-2">
              {stamps.slice(rowIndex * stampsPerRow, (rowIndex + 1) * stampsPerRow).map((filled, index) => {
                const stampIndex = rowIndex * stampsPerRow + index;
                const isLast = stampIndex === total - 1;

                return (
                  <div
                    key={stampIndex}
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-200",
                      filled
                        ? "bg-primary"
                        : "border-2 border-dashed border-primary/30 bg-transparent"
                    )}
                  >
                    {filled ? (
                      allRewards?.some(r => r.stampsRequired === stampIndex + 1) ? (
                        <Gift className="h-5 w-5 text-white" />
                      ) : (
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      )
                    ) : (isLast || allRewards?.some(r => r.stampsRequired === stampIndex + 1)) ? (
                      <Gift className="h-5 w-5 text-primary/60" />
                    ) : null}
                  </div>
                );
              })}
              {/* Fill remaining space in last row with empty placeholders */}
              {rowIndex === rows - 1 && stamps.slice(rowIndex * stampsPerRow).length < stampsPerRow && (
                <>
                  {Array.from({ length: stampsPerRow - stamps.slice(rowIndex * stampsPerRow).length }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9 w-9" />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mb-2" />
      </div>
    </div>
  );
});

StampCard.displayName = "StampCard";

export { StampCard };
export default StampCard;
