import { Skeleton } from "@/components/ui/skeleton";

export const ProfileSkeleton = () => (
    <div className="min-h-screen bg-background pb-24">
        {/* Header - matches gradient-primary with rounded bottom */}
        <div className="gradient-primary rounded-b-[2.5rem] px-5 pt-6 pb-12 text-center relative">
            {/* Title */}
            <Skeleton className="h-5 w-24 mx-auto mb-4 bg-white/20" />
            {/* Avatar circle */}
            <div className="relative inline-block">
                <Skeleton className="h-24 w-24 rounded-full bg-white/20 mx-auto" />
                {/* Edit button */}
                <Skeleton className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-white/30" />
            </div>
            {/* Name */}
            <Skeleton className="h-6 w-32 mx-auto mt-3 mb-1.5 bg-white/20" />
            {/* Badge row */}
            <div className="flex items-center justify-center gap-2 mt-1">
                <Skeleton className="h-5 w-20 rounded-full bg-white/20" />
                <Skeleton className="h-4 w-24 bg-white/10" />
            </div>
        </div>

        {/* Contact card - overlaps header with -mt-10 */}
        <div className="px-4 -mt-10">
            <div className="rounded-2xl bg-card shadow-card p-5">
                <Skeleton className="h-3 w-32 mb-4" />
                <div className="space-y-4">
                    {/* Phone row */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-3 w-20 mb-1.5" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                    </div>
                    {/* Email row */}
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-3 w-20 mb-1.5" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* App settings card */}
        <div className="px-4 mt-4">
            <div className="rounded-2xl bg-card shadow-soft overflow-hidden">
                <div className="px-5 pt-5 pb-3">
                    <Skeleton className="h-3 w-24" />
                </div>
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/30 last:border-b-0">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-4 rounded" />
                    </div>
                ))}
            </div>
        </div>

        {/* Sign out button */}
        <div className="px-4 mt-6">
            <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
    </div>
);
