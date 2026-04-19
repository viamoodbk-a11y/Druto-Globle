import { Skeleton } from '@/components/ui/skeleton';

export const RestaurantCardSkeleton = () => {
  return (
    <div className="w-full rounded-2xl bg-card border border-border/50 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-14 w-14 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
};

export const RestaurantCardSkeletonList = ({ count = 4 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
};
