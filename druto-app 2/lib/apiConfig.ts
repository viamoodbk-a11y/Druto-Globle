/**
 * Centralized API configuration for mobile app.
 * All Supabase calls go through Vercel Edge proxy to bypass ISP blocks.
 * To switch back to direct Supabase, just change the BASE_URL below.
 */

// Mobile uses full URL (can't use relative paths)
const BASE_URL = "https://druto.me/api/proxy";

export const SUPABASE_FUNCTIONS_URL = `${BASE_URL}/functions/v1`;
export const SUPABASE_REST_URL = `${BASE_URL}/rest/v1`;
export const SUPABASE_STORAGE_URL = `${BASE_URL}/storage/v1`;
export const SUPABASE_BASE_URL = BASE_URL;

// Supabase keys (public/anon — safe to expose)
export const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpemJrb3d6bHBsdWFjdmVrbnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjI0NDksImV4cCI6MjA4MjY5ODQ0OX0.ZgANrl2szBc_VWcJIQ_wNyMvkURzeW-Oa2DRt2IZ0z8";
