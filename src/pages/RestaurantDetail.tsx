import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState, useEffect, memo, useMemo, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRewardsData } from "@/hooks/useRewardsData";
import { PullToRefresh } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import {
  MapPin, Clock, Check,
  Phone, Star, ChevronRight, Gift, Loader2,
  Instagram, Facebook, Youtube
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
const StampCelebration = lazy(() => import("@/components/StampCelebration").then(m => ({ default: m.StampCelebration })));
const ClaimRewardModal = lazy(() => import("@/components/ClaimRewardModal").then(m => ({ default: m.ClaimRewardModal })));
import { RestaurantDetailSkeleton } from "@/components/skeletons/RestaurantDetailSkeleton";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { getCachedData, setCachedData } from "@/lib/queryCache";
import { RestaurantData, mapRestaurantData } from "@/lib/restaurantUtils";
import { ScratchCard } from "@/components/ScratchCard";

const getTier = (visits: number, total: number) => {
  const progress = visits / total;
  if (progress >= 0.8) return { name: "Tier Gold", color: "bg-yellow-500" };
  if (progress >= 0.5) return { name: "Tier Silver", color: "bg-gray-400" };
  return { name: "Tier Bronze", color: "bg-amber-600" };
};

// Helper to set/update meta tags
const updateMetaTag = (property: string, content: string, isProperty = true) => {
  const attribute = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attribute}="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

// Helper to remove meta tags
const removeMetaTag = (property: string, isProperty = true) => {
  const attribute = isProperty ? 'property' : 'name';
  const tag = document.querySelector(`meta[${attribute}="${property}"]`);
  if (tag) tag.remove();
};

// Helper to set/remove JSON-LD schema
const updateJsonLd = (id: string, data: object | null) => {
  let script = document.querySelector(`script#${id}`) as HTMLScriptElement;
  if (data) {
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  } else if (script) {
    script.remove();
  }
};

const RestaurantDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStamp, setCelebrationStamp] = useState(0);
  const [selectedReward, setSelectedReward] = useState<{
    id?: string;
    loyaltyCardId?: string;
    restaurantId?: string;
    rewardId?: string;
    restaurantName: string;
    rewardName: string;
    icon: string;
    imageUrl?: string;
    expiryDays?: number;
    expiresAt?: string;
  } | null>(null);
  const [showScratchCard, setShowScratchCard] = useState(false);

  const [expandedRewards, setExpandedRewards] = useState<Set<string>>(new Set());

  const toggleRewardExpansion = (rewardId: string) => {
    setExpandedRewards(prev => {
      const next = new Set(prev);
      if (next.has(rewardId)) {
        next.delete(rewardId);
      } else {
        next.add(rewardId);
      }
      return next;
    });
  };

  // Get userId from localStorage — wrapped in try-catch to handle malformed/stale data
  let userId: string | null = null;
  try {
    const authDataRaw = localStorage.getItem("druto_auth");
    if (authDataRaw) userId = JSON.parse(authDataRaw).userId;
  } catch {
    // Malformed auth data — treat as unauthenticated
  }

  const cacheKey = `restaurant_${slug}`;

  // Read cache once on component mount to prevent redundant disk I/O
  const cachedMeta = useMemo(() => {
    try {
      const cached = localStorage.getItem(`druto_cache_${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { data: parsed.data, timestamp: parsed.timestamp };
      }
    } catch { }
    return { data: undefined, timestamp: undefined };
  }, [cacheKey]);

  // Fetch restaurant data with React Query + localStorage cache
  const { data: restaurant, isLoading, refetch } = useQuery({
    queryKey: ['restaurant-detail', slug, userId],
    queryFn: async () => {
      if (!slug) return null;

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);


      // Get the user's session token for proper auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || ANON_KEY;

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/get-restaurant-detail`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            restaurantId: isUUID ? slug : null,
            slug: isUUID ? null : slug,
            userId,
          }),
        }
      );

      // Safe JSON parsing - handle non-JSON gateway errors
      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("Non-JSON response from get-restaurant-detail:", responseText);
        return null;
      }

      if (!response.ok || !result?.success || !result?.restaurant) {
        const errorMsg = result?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error("get-restaurant-detail failed:", errorMsg);
        // Toast can be added here if needed, but logging is key for debugging
        return null;
      }

      const rawData = result.restaurant;

      // Redirect UUID to slug — cache under slug key first to avoid double-fetch
      if (isUUID && rawData.slug) {
        const slugCacheKey = `restaurant_${rawData.slug}`;
        const mapped = mapRestaurantData(rawData);
        setCachedData(slugCacheKey, mapped);
        // Also prime React Query cache for the slug-based query
        queryClient.setQueryData(['restaurant-detail', rawData.slug, userId], mapped);
        navigate(`/restaurant/${rawData.slug}`, { replace: true });
        return mapped;
      }

      const mapped = mapRestaurantData(rawData);
      setCachedData(cacheKey, mapped);
      return mapped;
    },
    initialData: cachedMeta.data,
    initialDataUpdatedAt: cachedMeta.timestamp,
    staleTime: 1000 * 30, // 30 seconds
  });
  
  const { availableRewards } = useRewardsData();

  // Merge unredeemed rewards from API with those from the global rewards hook to ensure consistency
  // especially if the edge function deployment is lagging or if there's a cache mismatch.
  const mergedUnredeemedRewards = useMemo(() => {
    const fromApi = restaurant?.unredeemedRewards || [];
    if (!restaurant?.id || !availableRewards) return fromApi;

    const fromHook = availableRewards
      .filter(r => r.restaurantId === restaurant.id)
      .map(r => ({
        id: r.id,
        reward_id: r.rewardId,
        loyalty_card_id: r.loyaltyCardId,
        expires_at: r.expiresAt,
        reward: {
          id: r.rewardId,
          name: r.reward,
          reward_image_url: r.imageUrl
        }
      }));

    // Create a unique list based on claim ID
    const merged = [...fromApi];
    fromHook.forEach(hr => {
      if (!merged.some(mr => mr.id === hr.id)) {
        merged.push(hr);
      }
    });

    return merged.sort((a, b) => {
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    });
  }, [restaurant?.id, restaurant?.unredeemedRewards, availableRewards]);

  // Handle celebration from scan navigation
  useEffect(() => {
    const state = location.state as { justScanned?: boolean; stampNumber?: number } | null;
    if (state?.justScanned && state?.stampNumber) {
      setCelebrationStamp(state.stampNumber);
      setShowCelebration(true);
      // Refetch to get updated stamp count
      refetch();
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refetch]);

  // Setup real-time subscriptions for stamp updates
  useEffect(() => {
    if (!userId || !restaurant?.id) return;

    const loyaltyChannel = supabase
      .channel(`customer-loyalty-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "loyalty_cards",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).restaurant_id === restaurant.id) {
            refetch();
          }
        }
      )
      .subscribe();

    const scansChannel = supabase
      .channel(`customer-scans-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scans",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Trigger refetch if the scan belongs to this restaurant
          const scan = payload.new as any;
          if (scan && scan.restaurant_id === restaurant.id) {
            refetch();
          } else if (payload.eventType === "DELETE") {
            // For deletions, we might not have the restaurant_id in the payload, so we refetch to be safe
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(loyaltyChannel);
      supabase.removeChannel(scansChannel);
    };
  }, [userId, restaurant?.id, refetch]);

  // SEO: Update meta tags and JSON-LD when restaurant data changes
  useEffect(() => {
    if (restaurant) {
      // Page title
      document.title = `${restaurant.name} - ${restaurant.category} | Earn Rewards | Druto`;

      // Meta description
      const metaDescription = `Visit ${restaurant.name}${restaurant.address ? ` in ${restaurant.address}` : ''}. Earn free rewards with every visit! ${restaurant.reward} after ${restaurant.totalRequired} visits.`;
      updateMetaTag('description', metaDescription, false);

      // OpenGraph tags
      updateMetaTag('og:title', `${restaurant.name} - Earn Free Rewards | Druto`);
      updateMetaTag('og:description', metaDescription);
      updateMetaTag('og:type', 'business.business');
      updateMetaTag('og:url', `https://druto.in/restaurant/${restaurant.slug}`);
      if (restaurant.logoUrl) {
        updateMetaTag('og:image', restaurant.logoUrl);
      }

      // Twitter Card tags
      updateMetaTag('twitter:card', 'summary_large_image', false);
      updateMetaTag('twitter:title', `${restaurant.name} - Earn Free Rewards | Druto`, false);
      updateMetaTag('twitter:description', metaDescription, false);
      if (restaurant.logoUrl) {
        updateMetaTag('twitter:image', restaurant.logoUrl, false);
      }

      // JSON-LD LocalBusiness schema
      const localBusinessSchema: Record<string, any> = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": restaurant.name,
        "description": restaurant.rewardDescription,
        "url": `https://druto.in/restaurant/${restaurant.slug}`,
        "@id": `https://druto.in/restaurant/${restaurant.slug}#business`,
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": (restaurant.rating || 4.5).toString(),
          "bestRating": "5",
          "worstRating": "1"
        }
      };

      if (restaurant.address) {
        localBusinessSchema.address = {
          "@type": "PostalAddress",
          "streetAddress": restaurant.address,
          ...(restaurant.city && { "addressLocality": restaurant.city })
        };
      }

      if (restaurant.latitude && restaurant.longitude) {
        localBusinessSchema.geo = {
          "@type": "GeoCoordinates",
          "latitude": restaurant.latitude,
          "longitude": restaurant.longitude
        };
      }

      if (restaurant.phone) {
        localBusinessSchema.telephone = restaurant.phone;
      }

      if (restaurant.logoUrl) {
        localBusinessSchema.image = restaurant.logoUrl;
      }

      if (restaurant.website) {
        localBusinessSchema.sameAs = [restaurant.website];
      }

      updateJsonLd('local-business-schema', localBusinessSchema);
    }

    return () => {
      document.title = "Druto - Earn Free Rewards at Local Businesses Near You";
      removeMetaTag('og:title');
      removeMetaTag('og:description');
      removeMetaTag('og:type');
      removeMetaTag('og:url');
      removeMetaTag('og:image');
      removeMetaTag('twitter:card', false);
      removeMetaTag('twitter:title', false);
      removeMetaTag('twitter:description', false);
      removeMetaTag('twitter:image', false);
      updateJsonLd('local-business-schema', null);
    };
  }, [restaurant]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Show skeleton if loading and no cached data
  if (isLoading && !restaurant) {
    return <RestaurantDetailSkeleton />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="gradient-primary rounded-b-[32px] px-5 pt-10 pb-12" />
        <div className="px-4 py-12 text-center">
          <h2 className="text-lg font-bold text-foreground mb-2">Business Not Found</h2>
          <p className="text-muted-foreground text-sm mb-4">This business doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/explore")} variant="outline">
            Browse Businesses
          </Button>
        </div>
      </div>
    );
  }

  const allRewardsSorted = [...(restaurant.allRewards || [])].sort((a, b) => a.stampsRequired - b.stampsRequired);
  const nextMilestoneReward = allRewardsSorted.find(r => r.stampsRequired > restaurant.userVisits) || allRewardsSorted[allRewardsSorted.length - 1];
  const currentMilestone = nextMilestoneReward?.stampsRequired || 0;
  const maxPossibleStamps = Math.max(...allRewardsSorted.map(r => r.stampsRequired), 0);
  
  const isComplete = allRewardsSorted.some(r => restaurant.userVisits >= r.stampsRequired) || (mergedUnredeemedRewards && mergedUnredeemedRewards.length > 0);
  const remaining = Math.max(0, currentMilestone - restaurant.userVisits);
  const tier = getTier(restaurant.userVisits, currentMilestone);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background pb-24">
        <Suspense fallback={null}>
          <StampCelebration
            show={showCelebration}
            stampNumber={celebrationStamp}
            totalStamps={restaurant.totalRequired}
            restaurantName={restaurant.name}
            onComplete={() => {
              setShowCelebration(false);
            }}
          />
        </Suspense>

        {/* Header */}
        <div className="gradient-primary rounded-b-[2.5rem] px-5 pt-10 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Restaurant Logo */}
              <div className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center text-2xl overflow-hidden">
                {restaurant.logoUrl ? (
                  <img
                    src={getOptimizedImageUrl(restaurant.logoUrl, 88)}
                    alt={restaurant.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  restaurant.icon
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{restaurant.name}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-white/80 tracking-wide font-medium uppercase">PREMIUM PARTNER ✓</p>
                  {(() => {
                    const topUnredeemed = mergedUnredeemedRewards?.[0];
                    if (topUnredeemed?.expires_at) {
                      const expiryDate = new Date(topUnredeemed.expires_at);
                      const diffTime = expiryDate.getTime() - new Date().getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return (
                        <span className="text-[10px] text-white font-bold bg-white/20 px-1.5 py-0.5 rounded uppercase tracking-tight animate-pulse border border-white/20">
                          {diffDays <= 0 ? "EXPIRES TODAY" : `EXPIRES IN ${diffDays}D`}
                        </span>
                      );
                    }
                    if (nextMilestoneReward?.expiryDays) {
                      return (
                        <span className="text-[10px] text-white/60 font-bold bg-white/10 px-1.5 py-0.5 rounded uppercase tracking-tight">
                          {nextMilestoneReward.expiryDays}D EXPIRY
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Big stamp count */}
          <div className="mt-5">
            <h2 className="text-[32px] font-extrabold text-white leading-tight">
              {restaurant.userVisits} of {currentMilestone} Stamps
            </h2>
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="h-[8px] rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((restaurant.userVisits / currentMilestone) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 -mt-1 relative z-10 space-y-3 pt-3">


          {/* Scratch Card Available - Prominent Prompt */}
          {restaurant.pendingScratchCard && restaurant.name?.toLowerCase().includes("borcella") && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 p-[1.5px] shadow-lg shadow-amber-500/20"
            >
              <div className="bg-card rounded-[15px] p-3.5 flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-2xl animate-bounce">🎰</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-bold text-foreground mb-0.5">You have a scratch card!</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Don't miss out on your reward.</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setShowScratchCard(true)}
                  className="h-9 px-4 rounded-full text-[12px] font-bold bg-[#800000] text-white border-0 shadow-lg shadow-amber-900/10"
                >
                  SCRATCH NOW
                </Button>
              </div>
            </motion.div>
          )}

          {/* Rewards Section */}
          <div className="space-y-3 pt-1">
            <div className="space-y-2.5">
              {restaurant.allRewards.map((reward, i) => (
                <div key={reward.id || i} className="rounded-2xl bg-card shadow-card p-3.5 flex items-center gap-3.5 border border-border/40">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {reward.rewardImageUrl ? (
                      <img src={reward.rewardImageUrl} className="w-full h-full object-cover" alt="Reward" />
                    ) : (
                      <Gift className="h-6 w-6 text-primary/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <motion.h3 
                        layout
                        onClick={() => toggleRewardExpansion(reward.id || i.toString())}
                        className={cn(
                          "text-[15px] font-bold text-foreground leading-tight cursor-pointer transition-colors hover:text-primary/80",
                          !expandedRewards.has(reward.id || i.toString()) && "line-clamp-2"
                        )}
                      >
                        {reward.description}
                      </motion.h3>
                      {(restaurant.userVisits >= reward.stampsRequired || 
                        (mergedUnredeemedRewards && mergedUnredeemedRewards.some((ur: any) => ur.reward_id === reward.id))
                      ) && (
                        <span className="text-[9px] font-black bg-green-500 text-white px-2 py-0.5 rounded uppercase tracking-tighter shrink-0 ml-2 animate-pulse">
                          ACHIEVED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {reward.stampsRequired} STAMPS
                      </span>
                      <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                        {(restaurant.userVisits >= reward.stampsRequired || 
                          (mergedUnredeemedRewards && mergedUnredeemedRewards.some((ur: any) => ur.reward_id === reward.id))
                        ) ? "Ready to claim! 🎉" 
                          : `• Collect ${reward.stampsRequired - restaurant.userVisits} more`
                        }
                      </span>
                      {(() => {
                        const claim = mergedUnredeemedRewards?.find((ur: any) => ur.reward_id === reward.id);
                        if (claim?.expires_at) {
                          const expiryDate = new Date(claim.expires_at);
                          const diffTime = expiryDate.getTime() - new Date().getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const isExpiringSoon = diffDays <= 2 && diffDays > 0;
                          
                          return (
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded",
                              isExpiringSoon ? "text-white bg-red-500 animate-pulse" : "text-amber-600 bg-amber-50"
                            )}>
                              {isExpiringSoon ? `EXPIRES IN ${diffDays}D!` : `EXPIRES ${expiryDate.toLocaleDateString()}`}
                            </span>
                          );
                        }
                        if (reward.expiryDays) {
                          return (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight opacity-70 bg-muted/30 px-1.5 py-0.5 rounded">
                              {reward.expiryDays}D Expiry
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stamp Grid */}
          <div className="rounded-2xl bg-card shadow-card p-5">
            <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-4">
              STAMP CARD
            </h3>
            <div className="grid grid-cols-6 gap-2.5 mb-4 items-center">
              {Array.from({ length: maxPossibleStamps }).map((_, index) => {
                const stampNumber = index + 1;
                const filled = stampNumber <= restaurant.userVisits;
                const isNewlyStamped = showCelebration && stampNumber === celebrationStamp;
                const isBeyondCurrentMilestone = stampNumber > currentMilestone;
                const isRewardPoint = allRewardsSorted.some(r => r.stampsRequired === stampNumber);
                
                return (
                  <div
                    key={index}
                    className="relative flex items-center justify-center"
                  >
                    <AnimatePresence mode="wait">
                      {filled ? (
                        <motion.div
                          key={`filled-${index}`}
                          className={cn(
                            "aspect-square rounded-xl flex items-center justify-center bg-primary shrink-0",
                            (isBeyondCurrentMilestone && !isRewardPoint) ? "h-6 w-6 rounded-lg" : "w-full"
                          )}
                          initial={isNewlyStamped ? { scale: 0, rotate: -90 } : false}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={isNewlyStamped ? { type: "spring", stiffness: 300, damping: 15, delay: 0.2 } : { duration: 0 }}
                        >
                          <Check className={cn("text-white shrink-0", isBeyondCurrentMilestone ? "h-3 w-3" : "h-5 w-5")} strokeWidth={3} />
                          {isNewlyStamped && (
                            <motion.div
                              className="absolute inset-0 rounded-xl bg-primary/40"
                              initial={{ scale: 1 }}
                              animate={{ scale: 2, opacity: 0 }}
                              transition={{ duration: 0.6, delay: 0.3 }}
                            />
                          )}
                        </motion.div>
                      ) : (
                        <div
                          className={cn(
                            "aspect-square flex items-center justify-center shrink-0 transition-all duration-300",
                            (isBeyondCurrentMilestone && !isRewardPoint)
                              ? "h-4 w-4 rounded-full border border-primary/20 bg-primary/5" 
                              : "w-full rounded-xl border-2 border-dashed border-primary/30 bg-transparent"
                          )}
                        >
                          {isRewardPoint && (
                            <Gift className="h-5 w-5 text-primary/60" />
                          )}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Pending Stamp Notice */}
            {restaurant.pendingScans > 0 && (
              <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mt-3">
                <Loader2 className="h-4 w-4 text-amber-600 animate-spin flex-shrink-0" />
                <p className="text-[12px] text-amber-700 dark:text-amber-400 font-medium">
                  {restaurant.pendingScans === 1
                    ? "1 stamp is pending staff approval. It will be added once approved."
                    : `${restaurant.pendingScans} stamps are pending staff approval. They will be added once approved.`}
                </p>
              </div>
            )}

            <p className="text-center text-[13px] text-muted-foreground mt-3">
              You're <span className="text-primary font-bold">{remaining} stamps</span> away from your treat!
            </p>

            {/* Claim Reward Button - Always visible after stamp card */}
              <Button
                className="w-full h-[52px] rounded-full text-[15px] font-bold mt-5"
                variant="hero"
                onClick={() => {
                   navigate("/rewards");
                }}
                disabled={!isComplete}
              >
              <Gift className="h-5 w-5 mr-2" />
              Claim Reward
            </Button>

          </div>

          {/* Social Links & Reviews */}
          {(restaurant.googleReviewUrl || (restaurant.socialLinks && (restaurant.socialLinks.instagram || restaurant.socialLinks.facebook || restaurant.socialLinks.youtube))) && (
            <div className="rounded-2xl bg-card shadow-soft p-4">
              <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-3">
                FOLLOW & REVIEW
              </h3>
              <div className="flex items-center gap-3">
                {restaurant.googleReviewUrl && (
                  <button
                    onClick={async () => {
                      const rawText = restaurant.socialLinks?.google_review_text;
                      if (rawText) {
                        try {
                          const suggestions = rawText.split(';').map(t => t.trim()).filter(t => t.length > 0);
                          const chosenText = suggestions.length > 0 
                            ? suggestions[Math.floor(Math.random() * suggestions.length)]
                            : rawText;
                          await navigator.clipboard.writeText(chosenText);
                        } catch { }
                      }
                      let reviewUrl = restaurant.googleReviewUrl!;
                      const urlMatch = reviewUrl.match(/(https?:\/\/[^\s]+)/i);
                      if (urlMatch && urlMatch[1]) {
                        reviewUrl = urlMatch[1];
                      } else {
                        reviewUrl = reviewUrl.trim();
                        if (!reviewUrl.startsWith('http://') && !reviewUrl.startsWith('https://')) {
                          reviewUrl = 'https://' + reviewUrl;
                        }
                      }
                      window.open(reviewUrl, '_blank', 'noopener');
                    }}
                    className="h-10 px-5 rounded-full bg-amber-400 flex items-center justify-center gap-2.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Star className="h-4 w-4 text-amber-900 fill-amber-900" />
                    <span className="text-[13px] font-bold text-amber-900 whitespace-nowrap">Review on Google</span>
                  </button>
                )}

                {restaurant.socialLinks?.instagram && (
                  <a
                    href={restaurant.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                  >
                    <Instagram className="h-5 w-5 text-white" />
                  </a>
                )}
                {restaurant.socialLinks?.facebook && (
                  <a
                    href={restaurant.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center"
                  >
                    <Facebook className="h-5 w-5 text-white" />
                  </a>
                )}
                {restaurant.socialLinks?.youtube && (
                  <a
                    href={restaurant.socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center"
                  >
                    <Youtube className="h-5 w-5 text-white" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Business Info */}
          <div className="rounded-2xl bg-card shadow-soft p-4">
            <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-4">
              BUSINESS INFO
            </h3>

            <div className="space-y-4">
              {(restaurant.address || restaurant.city) && (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 pt-1">
                    {restaurant.city && (
                      <p className="text-[14px] font-medium text-foreground">{restaurant.city}</p>
                    )}
                    {restaurant.address && (
                      <p className="text-[12px] text-muted-foreground">{restaurant.address}</p>
                    )}
                  </div>
                </div>
              )}

              {(() => {
                const openingHours = restaurant.openingHours;
                let displayText = "Hours not set";
                let isCurrentlyOpen = false;
                let hasHours = false;

                let oh = openingHours;
                if (typeof oh === 'string' && oh.trim().startsWith('{')) {
                  try {
                    oh = JSON.parse(oh);
                  } catch (e) {}
                }

                const now = new Date();
                const currentDay = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
                const currentTime = now.getHours() * 60 + now.getMinutes();

                const parseTime = (t: string) => {
                  if (!t) return 0;
                  const [h, m] = t.split(':').map(Number);
                  return h * 60 + (m || 0);
                };

                const formatTime = (t: string) => {
                  if (!t) return "";
                  let [h, m] = t.split(':').map(Number);
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const h12 = h % 12 || 12;
                  return `${h12}${m ? `:${m.toString().padStart(2, '0')}` : ''} ${ampm}`;
                };

                // Handle legacy format { open: "...", close: "..." }
                if (oh && (oh.open || oh.close)) {
                  hasHours = true;
                  if (oh.open && oh.close) {
                    const openMin = parseTime(oh.open);
                    const closeMin = parseTime(oh.close);
                    isCurrentlyOpen = currentTime >= openMin && currentTime < closeMin;
                    displayText = isCurrentlyOpen ? `Open until ${formatTime(oh.close)}` : `Opens at ${formatTime(oh.open)}`;
                  } else if (oh.open) {
                    displayText = `Opens at ${formatTime(oh.open)}`;
                  }
                } 
                // Handle new structured format { monday: { isOpen: true, slots: [...] }, ... }
                else if (oh && typeof oh === 'object' && oh[currentDay]) {
                  const dayData = oh[currentDay];
                  if (dayData.isOpen && dayData.slots && dayData.slots.length > 0) {
                    hasHours = true;
                    // Check if current time falls into any slot
                    const activeSlot = dayData.slots.find((slot: any) => {
                      const openMin = parseTime(slot.open);
                      const closeMin = parseTime(slot.close);
                      return currentTime >= openMin && currentTime < closeMin;
                    });

                    if (activeSlot) {
                      isCurrentlyOpen = true;
                      displayText = `${formatTime(activeSlot.open)} - ${formatTime(activeSlot.close)}`;
                    } else {
                      // Find next slot today
                      const nextSlot = dayData.slots.find((slot: any) => parseTime(slot.open) > currentTime);
                      if (nextSlot) {
                        displayText = `${formatTime(nextSlot.open)} - ${formatTime(nextSlot.close)}`;
                      } else {
                        // Just show the first slot
                        const firstSlot = dayData.slots[0];
                        displayText = `${formatTime(firstSlot.open)} - ${formatTime(firstSlot.close)}`;
                      }
                    }
                  } else {
                    hasHours = true;
                    isCurrentlyOpen = false;
                    displayText = "Closed today";
                  }
                }
                // Handle raw string (non-JSON)
                else if (typeof oh === 'string' && oh.trim().length > 0) {
                  displayText = oh;
                  hasHours = false;
                }

                return (
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-foreground">{displayText}</p>
                      {hasHours && (
                        <p className={cn("text-[12px] font-medium", isCurrentlyOpen ? "text-green-600" : "text-red-500")}>
                          {isCurrentlyOpen ? "OPEN NOW" : "CLOSED"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-foreground">{restaurant.phone}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>

        </div>

      </div>

      {showScratchCard && restaurant.pendingScratchCard && (
        <ScratchCard
          isVisible={showScratchCard}
          scratchData={{
            id: restaurant.pendingScratchCard.id,
            won: restaurant.pendingScratchCard.won,
            rewardTitle: restaurant.pendingScratchCard.reward_title,
            rewardDescription: restaurant.pendingScratchCard.reward_description,
            rewardImageUrl: restaurant.pendingScratchCard.reward_image_url,
          }}
          restaurantName={restaurant.name}
          onComplete={() => {
            setShowScratchCard(false);
            refetch();
          }}
        />
      )}

      {selectedReward && (
        <Suspense fallback={null}>
          <ClaimRewardModal
            isOpen={!!selectedReward}
            onClose={() => setSelectedReward(null)}
            reward={selectedReward}
            onRewardClaimed={refetch}
          />
        </Suspense>
      )}
    </PullToRefresh>
  );
};

export default RestaurantDetail;