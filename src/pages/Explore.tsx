import { useState, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Utensils, Coffee, Scissors, Dumbbell, Navigation, Loader2, ShoppingBag, Pill, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useExploreData } from "@/hooks/useExploreData";
import { RestaurantCardSkeletonList } from "@/components/skeletons/RestaurantCardSkeleton";
import { OptimizedImage } from "@/components/OptimizedImage";
import { PullToRefresh } from "@/components/PullToRefresh";
import { mapRestaurantData } from "@/lib/restaurantUtils";

const categories = [
  { id: "all", label: "All", icon: Search },
  { id: "restaurant", label: "Dining", icon: Utensils },
  { id: "cafe", label: "Coffee", icon: Coffee },
  { id: "salon", label: "Salon", icon: Scissors },
  { id: "gym", label: "Gym", icon: Dumbbell },
  { id: "retail", label: "Retail", icon: ShoppingBag },
  { id: "pharmacy", label: "Pharmacy", icon: Pill },
  { id: "car_wash", label: "Car Wash", icon: Car },
];

const Explore = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { restaurants, isLoading, refetch } = useExploreData();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentCity, setCurrentCity] = useState<string | null>(null);

  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prefetch restaurant detail on touch/hover (debounced to prevent network flooding)
  const prefetchRestaurant = useCallback((slug: string) => {
    if (prefetchTimeoutRef.current) clearTimeout(prefetchTimeoutRef.current);

    prefetchTimeoutRef.current = setTimeout(() => {
      const authData = localStorage.getItem("druto_auth");
      const userId = authData ? JSON.parse(authData).userId : null;
      queryClient.prefetchQuery({
        queryKey: ['restaurant-detail', slug, userId],
        queryFn: async () => {
          const { data: result } = await supabase.functions.invoke('get-restaurant-detail', {
            body: { slug, userId },
          });
          if (!result?.success || !result?.restaurant) return null;
          return mapRestaurantData(result.restaurant);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }, 150);
  }, [queryClient]);

  const handleGetLocation = useCallback(async () => {
    if (!navigator.geolocation) return;

    const cachedCity = localStorage.getItem("druto_cached_city");
    if (cachedCity) {
      setCurrentCity(cachedCity);
      setSearch(cachedCity);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Your Location";
          localStorage.setItem("druto_cached_city", city);
          setCurrentCity(city);
          setSearch(city);
        } catch {
          setCurrentCity("Your Location");
        }
        setLocationLoading(false);
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const searchTerms = search.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
      if (searchTerms.length === 0) return !activeCategory || activeCategory === "all" || r.category === activeCategory;

      const searchableText = `${r.name} ${r.address || ""} ${r.phone || ""} ${r.reward || ""}`.toLowerCase();
      const searchableNumeric = (r.phone || "").replace(/\D/g, '');
      
      const matchesSearch = searchTerms.every(term => {
        const termNumeric = term.replace(/\D/g, '');
        if (termNumeric.length >= 7 && searchableNumeric.includes(termNumeric)) return true;
        return searchableText.includes(term);
      });
      const matchesCategory = !activeCategory || activeCategory === "all" || r.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [restaurants, search, activeCategory]);

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-background pb-24 overflow-x-hidden w-full">
        {/* Header */}
        <div className="gradient-primary rounded-b-[32px] px-5 pb-10 pt-12">
          <h1 className="text-[28px] font-bold text-white mb-1">Explore</h1>
          <p className="text-white/70 text-[14px]">Find new favorites near you</p>
        </div>

        {/* Current Location Button */}
        <div className="px-4 -mt-6 space-y-2">
          <button
            onClick={handleGetLocation}
            disabled={locationLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-card shadow-card border border-border text-[13px] font-medium text-primary transition-all active:scale-[0.98]"
          >
            {locationLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {currentCity || "Use my current location"}
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Find businesses near you"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-[52px] bg-card shadow-card rounded-full border-0 text-[15px]"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 mt-5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ overscrollBehaviorX: 'contain' }}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(isActive ? null : cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "gradient-primary text-white"
                      : "bg-card border border-border text-foreground"
                  )}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Header */}
        <div className="px-4 mt-6 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-foreground">Trending Near You</h2>
          <button className="text-[13px] font-semibold text-primary">View all</button>
        </div>

        <div className="px-4 mt-3 space-y-2.5">
          {isLoading && filteredRestaurants.length === 0 ? (
            <RestaurantCardSkeletonList count={4} />
          ) : filteredRestaurants.length > 0 ? (
            filteredRestaurants.map((restaurant, i) => (
              <button
                key={restaurant.id}
                onClick={() => navigate(`/restaurant/${restaurant.slug || restaurant.id}`)}
                onMouseEnter={() => restaurant.slug && prefetchRestaurant(restaurant.slug)}
                onTouchStart={() => restaurant.slug && prefetchRestaurant(restaurant.slug)}
                className={cn(
                  "w-full rounded-2xl bg-card shadow-soft p-3.5 text-left transition-all active:scale-[0.99]",
                  // Only animate on initial entry or when list is empty
                  isLoading ? "opacity-0 animate-slide-up" : "opacity-100",
                  `stagger-${Math.min(i + 1, 5)}`
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Restaurant Logo */}
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                    {restaurant.logoUrl ? (
                      <OptimizedImage
                        src={restaurant.logoUrl}
                        alt={restaurant.name}
                        width={88}
                        className="h-full w-full"
                      />
                    ) : (
                      restaurant.icon
                    )}
                  </div>

                  {/* Restaurant Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-foreground">{restaurant.name}</h3>
                    <p className="text-[13px] text-primary font-medium">Win: {restaurant.reward?.split(' after')[0] || 'Free Reward'}</p>
                    {restaurant.address && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{restaurant.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <span className={cn(
                    "text-[11px] font-semibold uppercase",
                    restaurant.isActive ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {restaurant.isActive ? "OPEN" : "CLOSED"}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-2xl">
                🔍
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">
                {restaurants.length === 0 ? "No businesses yet" : "No results found"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {restaurants.length === 0
                  ? "Be the first to join druto!"
                  : "Try a different search term"}
              </p>
            </div>
          )}
        </div>
      </PullToRefresh>
    </>
  );
};

export default Explore;