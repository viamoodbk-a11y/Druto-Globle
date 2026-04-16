import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = "druto_cache_";
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// In-memory synchronous cache for instant access during mount
const memoryCache = new Map<string, any>();

/**
 * Get cached data synchronously from memory
 */
export function getCachedData<T>(key: string): T | undefined {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return undefined;

    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        memoryCache.delete(key);
        AsyncStorage.removeItem(CACHE_PREFIX + key).catch(() => { });
        return undefined;
    }

    return entry.data;
}

/**
 * Store data in both memory and AsyncStorage
 */
export function setCachedData<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
    };

    // Update memory synchronously
    memoryCache.set(key, entry);

    // Persist to storage asynchronously
    AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry)).catch(() => {
        // Silently fail if storage is full/unavailable
    });
}

/**
 * Initialize the memory cache from AsyncStorage on app startup
 */
export async function initializeCache(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));

        if (cacheKeys.length === 0) return;

        const pairs = await AsyncStorage.multiGet(cacheKeys);

        const now = Date.now();
        const keysToRemove: string[] = [];

        for (const [key, value] of pairs) {
            if (value) {
                try {
                    const parsed: CacheEntry<any> = JSON.parse(value);
                    if (now - parsed.timestamp <= CACHE_TTL) {
                        const originalKey = key.replace(CACHE_PREFIX, '');
                        memoryCache.set(originalKey, parsed);
                    } else {
                        keysToRemove.push(key);
                    }
                } catch {
                    keysToRemove.push(key);
                }
            }
        }

        // Cleanup expired keys
        if (keysToRemove.length > 0) {
            await AsyncStorage.multiRemove(keysToRemove);
        }
    } catch (e) {
        console.warn("Failed to initialize query cache from storage", e);
    }
}
