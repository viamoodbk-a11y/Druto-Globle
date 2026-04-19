import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCachedData, setCachedData } from "@/lib/queryCache";
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";

const CACHE_KEY = "profile_data";
const QUERY_KEY = ["profile-data"];

interface ProfileData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  memberSince: string;
  totalVisits: number;
  rewardsEarned: number;
  level: number;
}

const fetchProfile = async (): Promise<ProfileData> => {
  const authData = localStorage.getItem("druto_auth");
  if (!authData) throw new Error("Not authenticated");

  const { userId, phone } = JSON.parse(authData);

  const response = await fetch(
    `${SUPABASE_FUNCTIONS_URL}/get-profile`,
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
  const profile = result.profile;

  const totalVisits = result.totalVisits || 0;
  const rewardsEarned = result.rewardsEarned || 0;
  const level = Math.floor(totalVisits / 10) + 1;

  const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
  const memberSince = createdAt.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const newData: ProfileData = {
    id: userId,
    fullName: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone_number || "",
    avatarUrl: profile?.avatar_url || null,
    memberSince,
    totalVisits,
    rewardsEarned,
    level,
  };

  // Persist to localStorage
  setCachedData(CACHE_KEY, newData);
  return newData;
};

export const useProfileData = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ProfileData>({
    queryKey: QUERY_KEY,
    queryFn: fetchProfile,
    initialData: () => getCachedData<ProfileData>(CACHE_KEY) ?? undefined,
    initialDataUpdatedAt: () => {
      try {
        const cached = localStorage.getItem(`druto_cache_${CACHE_KEY}`);
        if (cached) return JSON.parse(cached).timestamp;
      } catch { }
      return undefined;
    },
    staleTime: 1000 * 60 * 5,
  });

  const DEFAULT: ProfileData = {
    id: "",
    fullName: "",
    email: "",
    phone: "",
    avatarUrl: null,
    memberSince: "",
    totalVisits: 0,
    rewardsEarned: 0,
    level: 1,
  };

  return {
    ...(data ?? DEFAULT),
    isLoading: isLoading && !data,
    error: error ? (error as Error).message : null,
    refetch: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
};
