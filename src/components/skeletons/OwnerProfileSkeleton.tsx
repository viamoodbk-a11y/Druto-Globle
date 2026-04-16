import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const OwnerProfileSkeleton = () => {
    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Header - Gradient Style */}
            <div className="gradient-primary rounded-b-[32px] px-5 pb-8 pt-12">
                <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full h-10 w-10 bg-white/10" />
                    <div className="h-6 w-48 bg-white/20 rounded-lg animate-pulse" />
                </div>
                <div className="h-4 w-64 bg-white/10 rounded-md ml-12 animate-pulse" />
            </div>

            <div className="px-4 py-5 -mt-4 relative z-10">
                {/* Business Card Skeleton */}
                <div className="mb-6 overflow-hidden rounded-2xl bg-card shadow-card">
                    <div className="h-24 bg-muted animate-pulse" />
                    <div className="relative px-6 pb-6 pt-2">
                        <div className="relative -mt-12 mb-4 inline-block">
                            <div className="h-24 w-24 rounded-2xl bg-muted border-4 border-background animate-pulse" />
                        </div>
                        <div className="flex items-start justify-between">
                            <div className="space-y-2">
                                <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                            </div>
                            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Info Grid Skeleton */}
                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft">
                            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Profile Card Skeleton */}
                <div className="mb-6 rounded-2xl bg-card shadow-soft">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                            <div className="space-y-1.5">
                                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                    </div>
                </div>

                {/* Menu Items Skeleton */}
                <div className="mb-6 overflow-hidden rounded-2xl bg-card shadow-soft">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border-b border-border last:border-0">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                                <div className="space-y-1.5">
                                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                    <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                    ))}
                </div>

                {/* Logout Button Skeleton */}
                <div className="h-12 w-full rounded-xl bg-muted animate-pulse" />
            </div>
        </div>
    );
};
