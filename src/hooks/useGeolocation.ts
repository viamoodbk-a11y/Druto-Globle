import { useState, useCallback, useRef, useEffect } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

// Cache location for 30 seconds to avoid repeated GPS requests
const LOCATION_CACHE_MS = 30000;
let cachedLocation: { latitude: number; longitude: number; timestamp: number } | null = null;

interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => Promise<{ latitude: number; longitude: number } | null>;
  requestLocationWithRetry: (maxRetries?: number) => Promise<{ latitude: number; longitude: number } | null>;
  isWithinRadius: (targetLat: number, targetLng: number, radiusMeters: number) => boolean;
  getCachedLocation: () => { latitude: number; longitude: number } | null;
  preloadLocation: () => void;
}

// Haversine formula to calculate distance between two coordinates
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

  return R * c; // Distance in meters
};

export const useGeolocation = (): UseGeolocationReturn => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });
  
  const isRequestingRef = useRef(false);

  // Check if cached location is still valid
  const getCachedLocation = useCallback((): { latitude: number; longitude: number } | null => {
    if (cachedLocation && Date.now() - cachedLocation.timestamp < LOCATION_CACHE_MS) {
      return { latitude: cachedLocation.latitude, longitude: cachedLocation.longitude };
    }
    return null;
  }, []);

  const requestLocation = useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    // Return cached location if still valid
    const cached = getCachedLocation();
    if (cached) {
      console.log("Using cached location:", cached);
      setState({
        latitude: cached.latitude,
        longitude: cached.longitude,
        error: null,
        loading: false,
      });
      return Promise.resolve(cached);
    }

    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported",
        loading: false,
      }));
      return Promise.resolve(null);
    }

    // Prevent concurrent requests
    if (isRequestingRef.current) {
      console.log("Location request already in progress, waiting...");
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isRequestingRef.current) {
            clearInterval(checkInterval);
            const cached = getCachedLocation();
            resolve(cached);
          }
        }, 100);
        // Timeout after 20 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(getCachedLocation());
        }, 20000);
      });
    }

    isRequestingRef.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      let watchId: number | null = null;
      let resolved = false;
      
      const cleanup = () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        isRequestingRef.current = false;
      };
      
      const handleSuccess = (position: GeolocationPosition) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`Location obtained: lat=${latitude}, lng=${longitude}, accuracy=${accuracy}m`);
        
        // Cache the location
        cachedLocation = { latitude, longitude, timestamp: Date.now() };
        
        setState({
          latitude,
          longitude,
          error: null,
          loading: false,
        });
        resolve({ latitude, longitude });
      };
      
      const handleError = (error: GeolocationPositionError) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        
        console.log("Location error:", error.code, error.message);
        
        let errorMessage = "Unable to retrieve location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location in your browser/device settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location unavailable. Please check your GPS/location settings.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }

        setState({
          latitude: null,
          longitude: null,
          error: errorMessage,
          loading: false,
        });
        resolve(null);
      };
      
      // Timeout fallback - 8 seconds
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.log("Location timeout - no response from watchPosition");
          setState({
            latitude: null,
            longitude: null,
            error: "Location request timed out. Please try again.",
            loading: false,
          });
          resolve(null);
        }
      }, 8000);
      
      // Use watchPosition to force fresh location (works better on Safari)
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          clearTimeout(timeoutId);
          handleSuccess(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          handleError(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 0,
        }
      );
    });
  }, [getCachedLocation]);

  // Retry logic with exponential backoff
  const requestLocationWithRetry = useCallback(async (maxRetries = 3): Promise<{ latitude: number; longitude: number } | null> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Location attempt ${attempt}/${maxRetries}`);
      const result = await requestLocation();
      if (result) {
        return result;
      }
      
      // Wait before retry (1s, 2s, 3s)
      if (attempt < maxRetries) {
        console.log(`Retrying location in ${attempt}s...`);
        await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
    return null;
  }, [requestLocation]);

  // Preload location in background (non-blocking)
  const preloadLocation = useCallback(() => {
    if (!getCachedLocation() && !isRequestingRef.current) {
      console.log("Preloading location in background...");
      requestLocation().catch(console.error);
    }
  }, [getCachedLocation, requestLocation]);

  const isWithinRadius = useCallback(
    (targetLat: number, targetLng: number, radiusMeters: number): boolean => {
      if (state.latitude === null || state.longitude === null) {
        return false;
      }

      const distance = calculateDistance(
        state.latitude,
        state.longitude,
        targetLat,
        targetLng
      );

      return distance <= radiusMeters;
    },
    [state.latitude, state.longitude]
  );

  return {
    ...state,
    requestLocation,
    requestLocationWithRetry,
    isWithinRadius,
    getCachedLocation,
    preloadLocation,
  };
};
