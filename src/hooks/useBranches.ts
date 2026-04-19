import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
}

export const useBranches = (restaurantId: string | undefined) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBranches = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, address, city, latitude, longitude, is_active")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching branches:", error);
      } else {
        setBranches((data as Branch[]) || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const addBranch = async (branch: {
    name: string;
    address: string;
    city?: string;
    latitude: number | null;
    longitude: number | null;
  }) => {
    if (!restaurantId) return { success: false, error: "No restaurant" };

    const { error } = await supabase.from("branches").insert({
      restaurant_id: restaurantId,
      name: branch.name,
      address: branch.address,
      city: branch.city || null,
      latitude: branch.latitude,
      longitude: branch.longitude,
    } as any);

    if (error) {
      return { success: false, error: error.message };
    }
    await fetchBranches();
    return { success: true };
  };

  const deleteBranch = async (branchId: string) => {
    const { error } = await supabase
      .from("branches")
      .delete()
      .eq("id", branchId);

    if (error) {
      return { success: false, error: error.message };
    }
    await fetchBranches();
    return { success: true };
  };

  return { branches, isLoading, refetch: fetchBranches, addBranch, deleteBranch };
};