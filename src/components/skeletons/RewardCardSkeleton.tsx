import { Skeleton } from '@/components/ui/skeleton';

export const RewardCardSkeleton = () => {
  return (
    <div className="rounded-2xl bg-card border border-border/50 p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
};

export const RewardCardSkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <RewardCardSkeleton key={i} />
      ))}
    </div>
  );
};
