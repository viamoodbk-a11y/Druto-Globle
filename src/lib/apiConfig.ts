/**
 * Centralized API configuration.
 * Using direct Supabase instances (unbanned).
 * To switch to proxy, revert these changes if needed.
 */

// Direct connections to Supabase
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== "/") 
    ? import.meta.env.VITE_SUPABASE_URL 
    : "https://xbcizfkykozvcmoqildi.supabase.co";

const isProduction = typeof window !== 'undefined' && (window.location.hostname === 'druto.in' || window.location.hostname === 'druto-globle.vercel.app');
export const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const SUPABASE_REST_URL = `${SUPABASE_URL}/rest/v1`;
export const SUPABASE_STORAGE_URL = `${SUPABASE_URL}/storage/v1`;
export const SUPABASE_BASE_URL = SUPABASE_URL;

// Supabase keys (public/anon — safe to expose)
export const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY2l6Zmt5a296dmNtb3FpbGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjEwMTgsImV4cCI6MjA5MTkzNzAxOH0.zGSBP8WaNB2550Ce9-qswVH2kcp338mr8pXk5Fzxo5I";
