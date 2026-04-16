import { useState, useCallback } from "react";

// Supported cities/areas for the service
const SUPPORTED_AREAS = [
  { name: "Kolkata", lat: 22.5726, lng: 88.3639, radiusKm: 50 },
  { name: "Howrah", lat: 22.5958, lng: 88.2636, radiusKm: 30 },
  { name: "Salt Lake", lat: 22.5800, lng: 88.4119, radiusKm: 20 },
  { name: "New Town", lat: 22.5959, lng: 88.4815, radiusKm: 20 },
];

interface LocationValidationState {
  isValidating: boolean;
  isWithinServiceArea: boolean | null;
  currentLocation: { latitude: number; longitude: number } | null;
  nearestArea: string | null;
  distanceToNearestArea: number | null;
  error: string | null;
}

interface UseLocationValidationReturn extends LocationValidationState {
  validateLocation: () => Promise<boolean>;
  isWithinRestaurantRadius: (restaurantLat: number, restaurantLng: number, radiusMeters?: number) => boolean;
  clearError: () => void;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Hook for validating user location against service areas
 * Provides actual location checking, not just permission requests
 */
export const useLocationValidation = (): UseLocationValidationReturn => {
  const [state, setState] = useState<LocationValidationState>({
    isValidating: false,
    isWithinServiceArea: null,
    currentLocation: null,
    nearestArea: null,
    distanceToNearestArea: null,
    error: null,
  });

  /**
   * Request location and validate against supported service areas
   */
  const validateLocation = useCallback(async (): Promise<boolean> => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        isWithinServiceArea: false,
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isValidating: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Find the nearest supported area
          let nearestArea = SUPPORTED_AREAS[0];
          let shortestDistance = Infinity;

          for (const area of SUPPORTED_AREAS) {
            const distance = calculateDistance(latitude, longitude, area.lat, area.lng);
            if (distance < shortestDistance) {
              shortestDistance = distance;
              nearestArea = area;
            }
          }

          // Check if within any supported area's radius
          const isWithinServiceArea = shortestDistance <= nearestArea.radiusKm * 1000;
          const distanceKm = Math.round(shortestDistance / 1000);

          setState({
            isValidating: false,
            isWithinServiceArea,
            currentLocation: { latitude, longitude },
            nearestArea: nearestArea.name,
            distanceToNearestArea: distanceKm,
            error: isWithinServiceArea
              ? null
              : `You are ${distanceKm} km from ${nearestArea.name}. Service available within ${nearestArea.radiusKm} km.`,
          });

          resolve(isWithinServiceArea);
        },
        (error) => {
          let errorMessage = "Unable to retrieve location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location permission denied. Please enable location access to use this app.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable. Please try again.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out. Please check your GPS settings.";
              break;
          }

          setState({
            isValidating: false,
            isWithinServiceArea: false,
            currentLocation: null,
            nearestArea: null,
            distanceToNearestArea: null,
            error: errorMessage,
          });

          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // 15 seconds
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  }, []);

  /**
   * Check if current location is within specified radius of a restaurant
   * @param restaurantLat Restaurant latitude
   * @param restaurantLng Restaurant longitude
   * @param radiusMeters Radius in meters (default: 100m for in-store verification)
   */
  const isWithinRestaurantRadius = useCallback(
    (restaurantLat: number, restaurantLng: number, radiusMeters: number = 100): boolean => {
      if (!state.currentLocation) {
        return false;
      }

      const distance = calculateDistance(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        restaurantLat,
        restaurantLng
      );

      return distance <= radiusMeters;
    },
    [state.currentLocation]
  );

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    validateLocation,
    isWithinRestaurantRadius,
    clearError,
  };
};

export { SUPPORTED_AREAS };
