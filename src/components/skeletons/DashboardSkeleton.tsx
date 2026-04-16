import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardSkeletonProps {
  type?: "customer" | "owner";
  className?: string;
}

export const DashboardSkeleton = ({ type = "customer", className }: DashboardSkeletonProps) => {
  if (type === "owner") {
    return (
      <div className={cn("min-h-screen bg-background pb-24", className)}>
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div>
                  <Skeleton className="h-5 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        <div className="container py-6">
          {/* Stats Grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-xl" />
            ))}
          </div>

          {/* Content grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-card p-6 shadow-card">
              <Skeleton className="h-6 w-28 mb-4" />
              <Skeleton className="h-48 w-48 mx-auto rounded-2xl mb-4" />
              <Skeleton className="h-4 w-48 mx-auto mb-4" />
              <div className="flex gap-2 justify-center">
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-28 rounded-md" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-card p-6 shadow-card">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="rounded-xl bg-muted/30 p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-card p-6 shadow-card">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer skeleton
  return (
    <div className={cn("min-h-screen bg-background pb-24", className)}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* XP Badge */}
      <div className="px-4 mb-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      {/* Section Header */}
      <div className="px-4 mb-3 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-1.5">
          <Skeleton className="h-8 w-14 rounded-lg" />
          <Skeleton className="h-8 w-12 rounded-lg" />
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-card border border-border/50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[...Array(12)].map((_, j) => (
                <Skeleton key={j} className="aspect-square rounded-lg" />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
