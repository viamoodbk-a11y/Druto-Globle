// Supabase client instance
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { ANON_KEY, SUPABASE_URL } from '@/lib/apiConfig';

export const supabase = createClient<Database>(SUPABASE_URL, ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "druto_supabase_auth",
  },
});