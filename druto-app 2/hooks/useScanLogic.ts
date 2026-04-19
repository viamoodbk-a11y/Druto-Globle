import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { useState } from "react";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";

export interface ScanResult {
    success: boolean;
    error?: string;
    currentStamps?: number;
    totalStamps?: number;
    restaurantName?: string;
    restaurantSlug?: string;
    restaurantId?: string;
    rewardEarned?: boolean;
    alreadyScannedToday?: boolean;
    loyaltyPaused?: boolean;
    allowRemoteScan?: boolean;
    pendingApproval?: boolean;
    rewardImageUrl?: string | null;
}

const GEOFENCE_RADIUS = 50;

export const useScanLogic = () => {
    const [isProcessing, setIsProcessing] = useState(false);

    const processQRScan = async (
        restaurantId: string,
        options?: { staffApproved?: boolean; requestPending?: boolean }
    ): Promise<ScanResult> => {
        setIsProcessing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return { success: false, error: "Not authenticated" };
            }

            let userLocation: Location.LocationObject | null = null;

            if (!options?.requestPending && !options?.staffApproved) {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        userLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    }
                } catch (e) {
                    console.warn("Location fetch failed, proceeding with pending scan", e);
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(
                `${SUPABASE_FUNCTIONS_URL}/process-scan`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: ANON_KEY,
                        Authorization: `Bearer ${ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        userId: user.id,
                        restaurantId,
                        locationVerified: !!userLocation,
                        staffApproved: options?.staffApproved || false,
                        requestPendingApproval: options?.requestPending || false,
                        userLatitude: userLocation?.coords.latitude || null,
                        userLongitude: userLocation?.coords.longitude || null,
                        maxDistanceMeters: GEOFENCE_RADIUS,
                    }),
                }
            );

            const result = await response.json();

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
                    error: result.error || "This restaurant's loyalty program is currently paused.",
                };
            }

            if (result.tooFarFromRestaurant) {
                return {
                    success: false,
                    error: result.error || `You are too far from ${result.restaurantName}. Please move closer to the restaurant to claim your stamp.`,
                    allowRemoteScan: result.allowRemoteScan || false,
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
                rewardImageUrl: result.rewardImageUrl,
            };
        } catch (error: any) {
            console.error("Scan error:", error);
            return { success: false, error: error.message };
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        processQRScan,
        isProcessing,
    };
};
