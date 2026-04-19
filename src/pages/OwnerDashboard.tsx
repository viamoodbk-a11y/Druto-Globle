import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Gift,
  Trophy,
  Store,
  Plus,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useOwnerData } from "@/hooks/useOwnerData";
import { useSubscription } from "@/hooks/useSubscription";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SubscriptionBanner, TrialBanner, DynamicOwnerPopup, PromotionBanner, TrialCountdownPromotion } from "@/components/SubscriptionGate";
import { OverviewTab } from "@/pages/owner/OverviewTab";
import { CustomersTab } from "@/pages/owner/CustomersTab";
import { RewardsTab } from "@/pages/owner/RewardsTab";
import { SettingsTab } from "@/pages/owner/SettingsTab";
import { MarketingTab } from "@/pages/owner/MarketingTab";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

type TabType = "overview" | "customers" | "rewards" | "settings" | "marketing";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromUrl = (): TabType => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "customers" || tab === "settings" || tab === "overview" || tab === "rewards" || tab === "marketing") {
      return tab as TabType;
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrl());
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("session_id")) {
      toast({
        title: "Payment Successful! 🎉",
        description: "Your subscription has been activated. It may take a minute to reflect.",
      });
      // Clean up URL
      const newParams = new URLSearchParams(location.search);
      newParams.delete("session_id");
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [location.search, navigate, toast]);

  useEffect(() => {
    const tab = getTabFromUrl();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const { restaurant, rewards, stats, customers, claimedRewards, pendingScans, subscription: ownerDataSubscription, scratchCardConfigs, scratchCardRewards, isLoading, error, refetch } = useOwnerData();
  const { isActive: hookIsActive, isLoading: subscriptionLoading, isTrialing: hookIsTrialing, trialDaysLeft: hookTrialDaysLeft, planTier: hookPlanTier, refetch: refetchSubscription } = useSubscription();

  // Combine data sources, prioritizing hook data for real-time updates but using ownerData for instant cache
  const ownerSubscriptionActive = ownerDataSubscription?.isActive ?? hookIsActive;
  const isTrialing = ownerDataSubscription?.isTrialing ?? hookIsTrialing;
  const trialDaysLeft = ownerDataSubscription?.trialDaysLeft ?? hookTrialDaysLeft;
  const planTier = ownerDataSubscription?.planTier ?? hookPlanTier;
  const isSubscriptionLoading = subscriptionLoading && !ownerDataSubscription;

  const [showDynamicPopup, setShowDynamicPopup] = useState(false);
  const [popupConfig, setPopupConfig] = useState<{ imageUrl: string; ctaLink: string; delaySeconds: number } | null>(null);

  // Fetch dynamic popup config
  useEffect(() => {
    const fetchPopupConfig = async () => {
      const { data, error } = await supabase
        .from("hero_banners")
        .select("image_url, link_url, subtitle, is_active")
        .eq("title", "OWNER_SUBSCRIPTION_POPUP")
        .maybeSingle();
      
      if (!error && data && data.is_active) {
        setPopupConfig({
          imageUrl: data.image_url,
          ctaLink: data.link_url || "/pricing",
          delaySeconds: parseInt(data.subtitle || "3")
        });
      }
    };
    fetchPopupConfig();
  }, []);

  // Trigger Dynamic Popup
  useEffect(() => {
    if (!isLoading && !subscriptionLoading && restaurant && !ownerSubscriptionActive && popupConfig) {
      const hasShown = sessionStorage.getItem(`owner_popup_shown_${restaurant.id}`);
      if (!hasShown) {
        const timer = setTimeout(() => {
          setShowDynamicPopup(true);
          sessionStorage.setItem(`owner_popup_shown_${restaurant.id}`, "true");
        }, popupConfig.delaySeconds * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, subscriptionLoading, restaurant, ownerSubscriptionActive, popupConfig]);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Store className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Connection Issues</h2>
        <p className="text-muted-foreground mb-6 max-w-xs">
          We're having trouble reaching our servers. Please check your connection and try again.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="w-full max-w-xs">
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading && !restaurant) {
    return <DashboardSkeleton type="owner" />;
  }

  // Show setup prompt if no restaurant
  if (!restaurant && !isLoading) {
    const authData = localStorage.getItem("druto_auth");
    const hasRestaurantInAuth = authData ? JSON.parse(authData).hasRestaurant : false;

    if (hasRestaurantInAuth) {
      // Don't auto-refetch here to avoid loops, just show a message or use the error state above
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Syncing your business...</h2>
          <p className="text-muted-foreground mb-6">
            We're fetching your business details.
          </p>
          <Button onClick={() => refetch()} variant="hero" className="w-full max-w-xs">
            Refetch Data
          </Button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="gradient-primary rounded-b-[32px] px-5 pb-10 pt-12">
          <h1 className="text-lg font-bold text-white mb-1">Business Dashboard</h1>
          <p className="text-white/70 text-[13px]">Set up your business to get started</p>
        </div>

        <div className="px-4 -mt-6">
          <div className="rounded-2xl bg-card p-8 shadow-card text-center">
            <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Set Up Your Business</h2>
            <p className="text-[13px] text-muted-foreground mb-5">
              Create your business profile to start accepting loyalty scans
            </p>
            <Button
              variant="hero"
              size="lg"
              className="rounded-xl h-12"
              onClick={() => navigate("/owner/profile")}
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Business
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-background pb-24">
      {/* Header - Gradient Style */}
      <div className="gradient-primary rounded-b-[32px] px-5 pb-8 pt-12">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-xl bg-white/20 overflow-hidden flex items-center justify-center">
            {restaurant.logoUrl ? (
              <img
                src={getOptimizedImageUrl(restaurant.logoUrl, 120)}
                alt={restaurant.name}
                className="h-full w-full object-cover"
                fetchPriority="high"
                loading="eager"
              />
            ) : (
              <span className="text-xl font-bold text-white">
                {restaurant.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{restaurant.name}</h1>
              {!isSubscriptionLoading && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    ownerSubscriptionActive
                      ? "bg-green-500/30 text-green-100 border border-green-400/30"
                      : "bg-red-500/30 text-red-100 border border-red-400/30"
                  )}
                >
                  {ownerSubscriptionActive
                    ? isTrialing
                      ? "Free Trial"
                      : (planTier || "starter").charAt(0).toUpperCase() + (planTier || "starter").slice(1)
                    : "Inactive"}
                </span>
              )}
            </div>
            <p className="text-[13px] text-white/70">Business Dashboard</p>
          </div>
          {/* Profile Button in Header */}
          <button
            onClick={() => navigate("/owner/profile")}
            className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center transition-colors hover:bg-white/30"
          >
            <User className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Stats Grid - In Header */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <TrendingUp className="h-3.5 w-3.5 text-white/80" />
            </div>
            <p className="text-lg font-bold text-white">{stats.totalScans}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Scans</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Users className="h-3.5 w-3.5 text-white/80" />
            </div>
            <p className="text-lg font-bold text-white">{stats.uniqueCustomers}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Users</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Gift className="h-3.5 w-3.5 text-white/80" />
            </div>
            <p className="text-lg font-bold text-white">{stats.rewardsRedeemed}</p>
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Rewards</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Trophy className="h-3.5 w-3.5 text-white/80" />
            </div>
            <p className="text-lg font-bold text-white">
              {stats.repeatRate || 0}%
            </p>
            <p className="text-[10px] text-white/60 uppercase tracking-wide">Repeat</p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 -mt-4 relative z-10">
        {/* Trial Banner */}
        {/* Trial Banner & Countdown Promotion */}
        {!isSubscriptionLoading && isTrialing && (
          <>
            <TrialCountdownPromotion onPayClick={() => navigate("/pricing")} />
            {trialDaysLeft !== null && (
              <TrialBanner trialDaysLeft={trialDaysLeft} />
            )}
          </>
        )}

        {/* Enhanced Promotion Banner (shows when not subscribed) */}
        {!isSubscriptionLoading && !ownerSubscriptionActive && (
          <div className="mb-6">
            <PromotionBanner
              onPayClick={() => navigate("/pricing")}
            />
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "overview" && (
          <OverviewTab
            restaurant={restaurant}
            rewards={rewards}
            stats={stats}
            customers={customers}
            pendingScans={pendingScans}
            ownerId={JSON.parse(localStorage.getItem("druto_auth") || "{}").userId || ""}
            ownerSubscriptionActive={ownerSubscriptionActive}
            subscriptionLoading={subscriptionLoading}
            refetchSubscription={refetchSubscription}
            onEditReward={() => navigate("/owner?tab=settings", { replace: true })}
            refetch={refetch}
          />
        )}

        {activeTab === "customers" && (
          <CustomersTab
            customers={customers}
            restaurantName={restaurant.name}
          />
        )}

        {activeTab === "rewards" && (
          <RewardsTab
            claimedRewards={claimedRewards}
            scratchCardRewards={scratchCardRewards}
            restaurantName={restaurant.name}
            refetch={refetch}
          />
        )}

        {activeTab === "marketing" && restaurant && restaurant.name?.toLowerCase().includes("borcella") && (
          <MarketingTab
            restaurantId={restaurant.id}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab
            restaurant={restaurant}
            rewards={rewards}
            refetch={refetch}
            scratchCardConfigs={scratchCardConfigs}
          />
        )}
      </div>

      {/* Dynamic Admin-Controlled Popup */}
      {popupConfig && (
        <DynamicOwnerPopup
          open={showDynamicPopup}
          onOpenChange={setShowDynamicPopup}
          imageUrl={popupConfig.imageUrl}
          ctaLink={popupConfig.ctaLink}
        />
      )}
    </PullToRefresh>
  );
};

export default OwnerDashboard;
