import { Gift, Edit2, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CurrentRewardCardProps {
  name: string;
  description: string | null;
  imageUrl: string | null;
  stampsRequired: number;
  expiryDays: number | null;
  onEdit?: () => void;
  className?: string;
}

export const CurrentRewardCard = ({
  name,
  description,
  imageUrl,
  stampsRequired,
  expiryDays,
  onEdit,
  className,
}: CurrentRewardCardProps) => {
  return (
    <div className={cn("rounded-2xl bg-card p-6 shadow-card", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Current Reward</h2>
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5">
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 p-4">
        <div className="flex items-center gap-4">
          {/* Reward Image */}
          <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/20 shadow-soft">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <Gift className="h-10 w-10 text-primary" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate mb-1">
              {description || name}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-primary" />
                {stampsRequired} stamps
              </span>
              {expiryDays && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  {expiryDays} day expiry
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
