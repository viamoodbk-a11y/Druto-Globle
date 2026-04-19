import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCachedData, setCachedData } from "@/lib/queryCache";

interface OwnerProfileData {
  owner: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  business: {
    id: string;
    name: string;
    description: string;
    category: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    city: string;
    openingHours: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    socialLinks: Record<string, any> | null;
    googleReviewUrl: string | null;
    requireApproval: boolean;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const CACHE_KEY = "owner_profile_data";
const QUERY_KEY = ["owner-profile"];

export const useOwnerProfileData = () => {
  const queryClient = useQueryClient();

  const { data: queryData, isLoading, error } = useQuery<OwnerProfileData | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) throw new Error("Not authenticated");

      const { userId, phone } = JSON.parse(authData);

      // Call edge function (bypasses RLS — fixes blank profile when Supabase session isn't synced)
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/get-owner-profile-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load profile");
      }

      const profile = result.profile;
      const restaurant = result.restaurant;

      const newData: OwnerProfileData = {
        owner: {
          id: userId,
          name: profile?.full_name || "",
          phone: profile?.phone_number || phone || "",
          email: profile?.email || "",
        },
        business: restaurant
          ? {
              id: restaurant.id,
              name: restaurant.name,
              description: restaurant.description || "",
              category: restaurant.category || "other",
              phone: restaurant.phone || "",
              email: restaurant.email || "",
              website: restaurant.website || "",
              address: restaurant.address || "",
              city: restaurant.city || "",
              openingHours: typeof restaurant.openingHours === "object" && restaurant.openingHours !== null
                ? JSON.stringify(restaurant.openingHours)
                : (typeof restaurant.openingHours === "string" ? restaurant.openingHours : ""),
              logoUrl: restaurant.logoUrl,
              coverImageUrl: restaurant.coverImageUrl,
              latitude: restaurant.latitude ?? null,
              longitude: restaurant.longitude ?? null,
              socialLinks: typeof restaurant.socialLinks === "object" ? restaurant.socialLinks as Record<string, any> : null,
              googleReviewUrl: restaurant.google_review_url || restaurant.googleReviewUrl || null,
              requireApproval: restaurant.requireApproval || false,
            }
          : null,
        isLoading: false,
        error: null,
      };

      setCachedData(CACHE_KEY, newData);
      return newData;
    },
    initialData: () => getCachedData<OwnerProfileData>(CACHE_KEY) ?? undefined,
    initialDataUpdatedAt: () => {
      try {
        const cached = localStorage.getItem(`druto_cache_${CACHE_KEY}`);
        if (cached) return JSON.parse(cached).timestamp;
      } catch { }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const defaultOwner = { id: "", name: "", phone: "", email: "" };

  return {
    owner: queryData?.owner || defaultOwner,
    business: queryData?.business || null,
    isLoading: isLoading && !queryData,
    error: error ? (error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
};
