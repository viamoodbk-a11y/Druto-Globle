import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_BASE_URL, ANON_KEY } from './apiConfig';

// Custom fetch that rewrites Supabase URLs to include __proxy_path for the Vercel proxy
const proxyFetch: typeof fetch = (input, init) => {
    let url = typeof input === 'string' ? input : (input as Request).url;

    // If the URL contains /api/proxy/ and doesn't already have __proxy_path
    if (url.includes("/api/proxy/") && !url.includes("__proxy_path=")) {
        const parsed = new URL(url);
        // Extracts /functions/v1/... or /rest/v1/...
        const subPath = parsed.pathname.split("/api/proxy")[1];
        if (subPath) {
            parsed.pathname = "/api/proxy";
            parsed.searchParams.set("__proxy_path", subPath);
            url = parsed.toString();
        }
    }

    return fetch(url, init);
};

export const supabase = createClient(SUPABASE_BASE_URL, ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    global: {
        fetch: proxyFetch,
    },
});

