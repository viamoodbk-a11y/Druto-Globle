import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";

interface ScanResult {
  success: boolean;
  error?: string;
  currentStamps?: number;
  totalStamps?: number;
  restaurantName?: string;
  restaurantSlug?: string;
  restaurantId?: string;
  rewardEarned?: boolean;
  alreadyScannedToday?: boolean;
  locationRetryable?: boolean;
  loyaltyPaused?: boolean;
  allowRemoteScan?: boolean;
  pendingApproval?: boolean;
  tooFarFromRestaurant?: boolean;
  scanId?: string;
  scratchCard?: {
    id: string;
    won: boolean;
    rewardTitle: string | null;
    rewardDescription: string | null;
    rewardImageUrl: string | null;
  } | null;
}

const GEOFENCE_RADIUS = 200; // 200 meters - allows for GPS inaccuracy especially in dense urban areas

export const useScanLogic = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { requestLocationWithRetry } = useGeolocation();

  const processQRScan = async (
    restaurantId: string,
    options?: { skipLocation?: boolean; staffApproved?: boolean; requestPending?: boolean }
  ): Promise<ScanResult> => {
    setIsProcessing(true);

    try {
      // Get user from localStorage
      const authData = localStorage.getItem("druto_auth");
      if (!authData) {
        return { success: false, error: "Not authenticated" };
      }

      const { userId } = JSON.parse(authData);

      // Try to get location, but don't block if unavailable
      let userLocation: { latitude: number; longitude: number } | null = null;

      if (options?.requestPending) {
        // User explicitly requested pending approval — skip location entirely
        console.log("User requested pending approval, skipping location");
      } else if (!options?.staffApproved) {
        // Always request fresh location with retry logic (3 attempts), ignoring cache
        console.log("Requesting fresh location with retry...");
        userLocation = await requestLocationWithRetry(3);

        // If no location, we still proceed - edge function will enforce block if allowRemoteScan is OFF
        if (!userLocation) {
          console.log("No location available, scan will be sent without coordinates");
        }
      }

      // Call the process-scan edge function
      const functionUrl = `${SUPABASE_FUNCTIONS_URL}/process-scan`;
      console.log(`Scanning at: ${functionUrl}`);
      
      const response = await fetch(
        functionUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify({
            userId,
            restaurantId,
            locationVerified: !!userLocation,
            staffApproved: options?.staffApproved || false,
            requestPendingApproval: options?.requestPending || false,
            userLatitude: userLocation?.latitude || null,
            userLongitude: userLocation?.longitude || null,
            maxDistanceMeters: GEOFENCE_RADIUS,
          }),
        }
      ).catch(fetchError => {
        console.error("Fetch failed:", fetchError);
        throw new Error("Connection failed. Please check your internet.");
      });

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Non-JSON response received:", responseText.substring(0, 200));
        if (response.status === 404) {
          return { success: false, error: "The scan service is temporarily unavailable (404). Please try again later." };
        }
        return { success: false, error: `Invalid server response (${response.status}). If this persists, please contact support.` };
      }

      if (result.alreadyScannedToday) {
        return {
          success: false,
          alreadyScannedToday: true,
          error: "Already scanned today",
          restaurantName: result.restaurantName,
          restaurantSlug: result.restaurantSlug,
          restaurantId: result.restaurantId,
        };
      }

      if (result.loyaltyPaused) {
        return {
          success: false,
          loyaltyPaused: true,
          restaurantName: result.restaurantName,
          error: result.error || "This loyalty program is currently paused.",
        };
      }
      if (result.tooFarFromRestaurant) {
        return {
          success: false,
          error: result.error || `You are too far from ${result.restaurantName || 'the business'}. Please move closer to the business to claim your stamp.`,
          allowRemoteScan: result.allowRemoteScan || false,
          locationRetryable: true,
          tooFarFromRestaurant: true,
        };
      }

      if (!result.success) {
        return { success: false, error: result.error || "Scan failed" };
      }

      return {
        success: true,
        pendingApproval: result.pendingApproval || false,
        currentStamps: result.currentStamps,
        totalStamps: result.totalStamps,
        restaurantName: result.restaurantName,
        restaurantSlug: result.restaurantSlug,
        restaurantId: result.restaurantId,
        rewardEarned: result.rewardEarned,
        scratchCard: result.scratchCard || null,
        scanId: result.scanId,
      };
    } catch (error: any) {
      console.error("Scan error catch block:", error);
      return { success: false, error: error.message || "Failed to process scan" };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processQRScan,
    isProcessing,
  };
};
