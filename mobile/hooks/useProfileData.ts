import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { getCachedData, setCachedData } from "../lib/queryCache";

export interface ProfileData {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    email: string | null;
    phone: string | null;
    memberSince: string | null;
    userType: 'customer' | 'owner';
}

const CACHE_KEY = "profile_data";
const QUERY_KEY = ["profile-data"];

const fetchProfile = async (): Promise<ProfileData | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/get-profile`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: ANON_KEY,
                Authorization: `Bearer ${ANON_KEY}`,
            },
            body: JSON.stringify({ userId: user.id }),
        }
    );

    const result = await response.json();
    if (!result.success) throw new Error(result.error || "Failed to fetch profile");

    const profile = result.profile;
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Jan 2026';

    const newData: ProfileData = {
        id: user.id,
        fullName: profile?.full_name || null,
        avatarUrl: profile?.avatar_url || null,
        email: profile?.email || null,
        phone: profile?.phone_number || null,
        memberSince: memberSince,
        userType: profile?.user_type || 'customer',
    };

    setCachedData(CACHE_KEY, newData);
    return newData;
};

export const useProfileData = () => {
    const { data, isLoading, error, refetch } = useQuery<ProfileData | null>({
        queryKey: QUERY_KEY,
        queryFn: fetchProfile,
        initialData: () => getCachedData<ProfileData>(CACHE_KEY),
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,   // 30 min — keep in memory across tab switches
    });

    return {
        profile: data,
        isLoading,
        refetch,
    };
};
