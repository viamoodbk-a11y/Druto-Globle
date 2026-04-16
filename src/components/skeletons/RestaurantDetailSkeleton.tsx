import { Skeleton } from "@/components/ui/skeleton";

export const RestaurantDetailSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-primary rounded-b-[2.5rem] px-5 pt-10 pb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full bg-white/20" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32 bg-white/20" />
            <Skeleton className="h-3 w-24 bg-white/20" />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <Skeleton className="h-8 w-48 bg-white/20" />
          <Skeleton className="h-[8px] w-full rounded-full bg-white/20" />
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {/* Next Treat Card */}
        <div className="rounded-2xl bg-card shadow-card p-4 flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Stamp Grid */}
        <div className="rounded-2xl bg-card shadow-card p-5">
          <Skeleton className="h-3 w-20 mb-4" />
          <div className="grid grid-cols-6 gap-2.5 mb-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>

        {/* Business Info */}
        <div className="rounded-2xl bg-card shadow-soft p-4">
          <Skeleton className="h-3 w-24 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
