import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState } from "react";

interface RewardItem {
  id?: string;
  name?: string;
  description: string;
  stampsRequired: number;
  expiryDays: number;
  rewardImageUrl: string;
  icon?: string;
}

interface RewardConfigData {
  googleReviewUrl?: string;
  openingHours?: { open: string; close: string };
}

export const useRewardConfig = () => {
  const [isSavingRewards, setIsSavingRewards] = useState(false);
  const [isSavingScratch, setIsSavingScratch] = useState(false);

  const saveRewardConfig = async (
    restaurantId: string,
    rewards?: RewardItem[],
    config?: RewardConfigData,
    scratchCardConfigs?: {
      id?: string;
      isEnabled: boolean;
      oddsNumerator: number;
      oddsDenominator: number;
      rewardTitle: string;
      rewardDescription: string | null;
      rewardImageUrl: string | null;
    }[],
    source: 'rewards' | 'scratch' = 'rewards'
  ): Promise<{ success: boolean; error?: string; scratchCardConfigs?: any[] }> => {
    if (source === 'rewards') setIsSavingRewards(true);
    else setIsSavingScratch(true);

    try {
      const authData = localStorage.getItem("druto_auth");
      if (!authData) {
        return { success: false, error: "Not authenticated" };
      }
      const { userId } = JSON.parse(authData);

      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/save-reward-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({
            restaurantId,
            rewards,
            config,
            userId,
            scratchCardConfigs: scratchCardConfigs,
            scratchCardConfig: scratchCardConfigs && scratchCardConfigs.length > 0 ? scratchCardConfigs[0] : undefined,
          }),
        }
      );

      const result = await response.json();
      console.log("Save Reward Config API Response:", result);

      if (!result.success) {
        return { success: false, error: result.error || "Failed to save" };
      }

      return { 
        success: true, 
        scratchCardConfigs: result.scratchCardConfigs 
      };
    } catch (error: any) {
      console.error("Save reward config error:", error);
      return { success: false, error: error.message };
    } finally {
      if (source === 'rewards') setIsSavingRewards(false);
      else setIsSavingScratch(false);
    }
  };

  return { 
    saveRewardConfig, 
    isSaving: isSavingRewards || isSavingScratch, 
    isSavingRewards, 
    isSavingScratch 
  };
};
