/**
 * Simple localStorage cache for React Query data
 * Provides instant display of cached data while fresh data loads in background
 */

const CACHE_PREFIX = "druto_cache_";
const CACHE_VERSION = "v1";
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version?: string;
}

/**
 * Get cached data if it exists and hasn't expired
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);

    // Check version - if version mismatch, clear cache
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store data in cache with timestamp
 */
export function setCachedData<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage might be full, silently fail
  }
}

/**
 * Clear specific cache entry
 */
export function clearCachedData(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch {
    // Silently fail
  }
}

/**
 * Clear all cached data
 */
export function clearAllCachedData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Silently fail
  }
}
