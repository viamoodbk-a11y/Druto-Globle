import { Skeleton } from "@/components/ui/skeleton";

export const RewardsSkeleton = () => (
    <div className="min-h-screen bg-background pb-24">
        {/* Header - matches gradient-primary with rounded-b-[32px] */}
        <div className="gradient-primary rounded-b-[32px] px-5 pb-10 pt-12">
            <Skeleton className="h-8 w-36 mb-1.5 bg-white/20" />
            <Skeleton className="h-4 w-52 bg-white/10" />
        </div>

        {/* Available Rewards */}
        <div className="px-4 mt-4 space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-card shadow-card overflow-hidden">
                    <div className="p-4 flex gap-4">
                        {/* Left content */}
                        <div className="flex-1">
                            {/* Restaurant name row */}
                            <div className="flex items-center gap-2 mb-2">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-4 w-8 rounded" />
                            </div>
                            {/* Reward name */}
                            <Skeleton className="h-6 w-40 mb-1" />
                            {/* Expiry */}
                            <Skeleton className="h-4 w-28 mb-3" />
                            {/* Redeem button */}
                            <Skeleton className="h-9 w-24 rounded-full" />
                        </div>
                        {/* Right image */}
                        <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
                    </div>
                </div>
            ))}
        </div>

        {/* History section */}
        <div className="px-4 mt-8">
            <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-14" />
            </div>
            <div className="space-y-2.5">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-2xl bg-card shadow-soft p-3.5 flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                            <Skeleton className="h-4 w-36 mb-1.5" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);
