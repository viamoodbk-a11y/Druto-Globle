import { useCallback, useEffect, useState, useRef } from "react";
import { StampCard } from "@/components/StampCard";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Sparkles, User, Gift, Zap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useCustomerData } from "@/hooks/useCustomerData";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { getCachedData, setCachedData } from "@/lib/queryCache";
import { useQuery } from "@tanstack/react-query";
import drutoLogo from "@/assets/druto-logo-gift.png";

interface HeroBanner {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
}

const BANNER_CACHE_KEY = "hero_banners";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { loyaltyCards, totalVisits, rewardsEarned, isLoading, profile, refetch } = useCustomerData();
  // Fetch banners using TanStack Query
  const { data: bannerData, isLoading: isBannersLoading } = useQuery({
    queryKey: [BANNER_CACHE_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners")
        .select("id, image_url, title, subtitle, link_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(3);

      if (error) throw error;
      if (data) setCachedData(BANNER_CACHE_KEY, data);
      return data as HeroBanner[];
    },
    initialData: () => getCachedData<HeroBanner[]>(BANNER_CACHE_KEY) ?? undefined,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const banners = bannerData || [];
  const bannersLoading = isBannersLoading && banners.length === 0;

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const activeRewards = loyaltyCards.filter((r) => r.current < r.total);
  // Get name from profile data, or fall back to stored auth data to avoid "User" flash
  const getStoredName = () => {
    try {
      const auth = localStorage.getItem("druto_auth");
      if (auth) {
        const parsed = JSON.parse(auth);
        return parsed.profile?.full_name;
      }
    } catch { }
    return null;
  };

  const userName = profile?.fullName || getStoredName();
  const isNameLoading = isLoading && !userName;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING,";
    if (hour < 17) return "GOOD AFTERNOON,";
    return "GOOD EVENING,";
  };

  // Loading state - show skeleton for cards but keep header/banners visible
  const showCardsSkeleton = isLoading && loyaltyCards.length === 0;

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-background pb-24">
        {/* Curved Header */}
        <div className="relative">
          <div className="gradient-primary rounded-b-[32px] px-4 pt-8 pb-6">
            {/* Greeting Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <img src={drutoLogo} alt="Druto" className="h-10 w-10 object-contain" />
                <div>
                  <p className="text-[10px] text-white/80 tracking-wide font-medium">{getGreeting()}</p>
                  {isNameLoading ? (
                    <Skeleton className="h-5 w-32 bg-white/20" />
                  ) : (
                    <h1 className="text-base font-bold text-white">{userName || "User"}</h1>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate("/profile")}
                className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <User className="h-3.5 w-3.5 text-white" />
              </button>
            </div>

            {/* Stats Cards Row - Compact */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm py-1.5 px-1 text-center">
                <Gift className="h-3.5 w-3.5 text-white/90 mx-auto mb-0.5" />
                <p className="text-sm font-bold text-white leading-tight">{rewardsEarned}</p>
                <p className="text-[8px] text-white/70 uppercase tracking-wider font-medium">Rewards</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm py-1.5 px-1 text-center">
                <Zap className="h-3.5 w-3.5 text-white/90 mx-auto mb-0.5" />
                <p className="text-sm font-bold text-white leading-tight">{activeRewards.length}</p>
                <p className="text-[8px] text-white/70 uppercase tracking-wider font-medium">Active</p>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm py-1.5 px-1 text-center">
                <MapPin className="h-3.5 w-3.5 text-white/90 mx-auto mb-0.5" />
                <p className="text-sm font-bold text-white leading-tight">{totalVisits}</p>
                <p className="text-[8px] text-white/70 uppercase tracking-wider font-medium">Visits</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Banners Carousel - Manual Swipe */}
        {bannersLoading ? (
          <div className="-mt-3 relative z-10 px-4">
            <Skeleton className="w-full aspect-[2.2/1] rounded-lg" />
          </div>
        ) : banners.length > 0 ? (
          <div className="-mt-3 relative z-10 overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <div className="flex gap-2.5 px-4" style={{ width: 'max-content' }}>
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className="relative overflow-hidden cursor-pointer flex-shrink-0 rounded-lg snap-center"
                  style={{ width: banners.length > 1 ? 'calc(78vw)' : 'calc(100vw - 32px)', scrollSnapStop: 'always' }}
                  onClick={() => banner.link_url && window.open(banner.link_url, "_blank")}
                >
                  <div className="aspect-[2.2/1]">
                    <img
                      src={getOptimizedImageUrl(banner.image_url, 600)}
                      alt={banner.title || "Promotion"}
                      className="w-full h-full object-cover"
                      loading="eager"
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                  </div>
                  {(banner.title || banner.subtitle) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                      {banner.title && (
                        <span className="inline-block bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-0.5">
                          {banner.title}
                        </span>
                      )}
                      {banner.subtitle && (
                        <p className="text-white text-xs font-medium">{banner.subtitle}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Section Header */}
        <div className="px-4 mt-5 mb-3">
          <h2 className="text-base font-bold text-foreground">Your Stamp Cards</h2>
        </div>

        {/* Stamp Cards */}
        <div className="px-4 pb-24 space-y-3">
          {showCardsSkeleton ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[...Array(12)].map((_, j) => (
                    <Skeleton key={j} className="aspect-square rounded-lg" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <>
              {loyaltyCards.map((card, index) => (
                <StampCard
                  key={card.id}
                  current={card.current}
                  total={card.total}
                  restaurantName={card.restaurantName}
                  rewardDescription={card.rewardDescription}
                  restaurantLogoUrl={card.restaurantLogoUrl}
                  fallbackIcon={card.rewardItem}
                  allRewards={card.allRewards}
                  onClick={() => navigate(`/restaurant/${card.restaurantSlug || card.restaurantId}`)}
                  className={cn(
                    // Only animate on initial entry
                    isLoading ? "opacity-0 animate-slide-up" : "opacity-100",
                    `stagger-${Math.min(index + 1, 5)}`
                  )}
                />
              ))}

              {loyaltyCards.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">
                    🎁
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    No stamp cards yet
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Scan a QR code to start collecting!
                  </p>
                  <button
                    onClick={() => navigate("/scan")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                  >
                    <Sparkles className="h-4 w-4" />
                    Scan QR Code
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>
    </>
  );
};

export default CustomerDashboard;
