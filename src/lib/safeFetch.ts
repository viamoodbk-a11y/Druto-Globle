/**
 * Safe fetch wrapper for Supabase Edge Functions.
 * - Uses the user's session token when available
 * - Safely parses JSON responses (handles non-JSON gateway errors)
 */
import { SUPABASE_FUNCTIONS_URL, ANON_KEY } from "@/lib/apiConfig";
import { supabase } from "@/integrations/supabase/client";

interface SafeFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  isFormData?: boolean;
}

interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

export async function safeFetch<T = any>(
  functionName: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const { method = "POST", body, isFormData = false } = options;

  // Get auth token
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token || ANON_KEY;

  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/${functionName}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();

    let data: T | null = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(`Non-JSON response from ${functionName}:`, responseText.substring(0, 200));
      return {
        ok: false,
        status: response.status,
        data: null,
        error: `Server returned non-JSON response (${response.status})`,
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? undefined : (data as any)?.error || `HTTP ${response.status}`,
    };
  } catch (err: any) {
    console.error(`Network error calling ${functionName}:`, err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || "Network error",
    };
  }
}
