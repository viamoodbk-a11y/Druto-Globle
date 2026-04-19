import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type UserRole = "customer" | "restaurant_owner" | "admin" | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuthFromLogin: (userId: string, role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  setAuthFromLogin: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Track localStorage-based auth for when Supabase session isn't ready yet
  const [localStorageAuth, setLocalStorageAuth] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    // Check localStorage auth first (instant check)
    const checkLocalStorageAuth = (): { userId: string; role: UserRole } | null => {
      try {
        const authData = localStorage.getItem("druto_auth");
        if (authData) {
          const parsed = JSON.parse(authData);
          const expiresAt = parsed.expiresAt || 0;
          
          // Check if expired
          if (Date.now() > expiresAt) {
            localStorage.removeItem("druto_auth");
            return null;
          }
          
          if (parsed.isAuthenticated && parsed.userId && parsed.role) {
            return { userId: parsed.userId, role: parsed.role as UserRole };
          }
        }
      } catch (e) {
        console.error("Error reading localStorage auth:", e);
      }
      return null;
    };

    // Fast role fetch from DB
    const fetchUserRoleFromDB = async (userId: string): Promise<UserRole> => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data) {
          console.log("Role from DB:", data.role);
          return data.role as UserRole;
        }
      } catch (err) {
        console.error("Error fetching role from DB:", err);
      }
      return null;
    };

    // Initialize auth - check localStorage first, then Supabase session
    const initializeAuth = async () => {
      try {
        // STEP 1: Check localStorage for quick auth (handles post-redirect case)
        const localAuth = checkLocalStorageAuth();
        if (localAuth) {
          console.log("Auth from localStorage:", localAuth.role);
          setRole(localAuth.role);
          setLocalStorageAuth(true);
          
          // IMPORTANT: Set loading to false IMMEDIATELY when we have valid localStorage auth
          // This prevents blank page issues by ensuring the app can render
          if (mounted) {
            setIsLoading(false);
          }
          
          // Try to get Supabase session (may still be loading) - do this AFTER setting loading false
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          
          if (mounted && existingSession?.user) {
            setSession(existingSession);
            setUser(existingSession.user);
          }
          
          return;
        }

        // STEP 2: No localStorage auth, check Supabase session
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);

          // Fetch role from DB
          const userRole = await fetchUserRoleFromDB(existingSession.user.id);
          if (mounted) {
            setRole(userRole);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener for changes AFTER initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // Skip INITIAL_SESSION - we handle it in initializeAuth
        if (event === "INITIAL_SESSION") {
          return;
        }

        console.log("Auth state change:", event);

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);

          // Check localStorage first for role
          const localAuth = checkLocalStorageAuth();
          if (localAuth && localAuth.userId === newSession.user.id) {
            setRole(localAuth.role);
            setLocalStorageAuth(true);
          } else {
            // Fetch role from DB
            const userRole = await fetchUserRoleFromDB(newSession.user.id);
            if (mounted) {
              setRole(userRole);
            }
          }
          if (mounted) {
            setIsLoading(false);
          }
        } else {
          // CRITICAL FIX: Do NOT log the user out just because Supabase fired SIGNED_OUT.
          // This can happen when a JWT refresh fails due to a transient network issue.
          // If we still have a valid druto_auth token in localStorage, keep the user logged in.
          const localAuth = checkLocalStorageAuth();
          if (localAuth) {
            console.log("Supabase session ended but valid druto_auth token exists. Keeping user logged in.", event);
            setLocalStorageAuth(true);
            setRole(localAuth.role);
            // Clear the Supabase-specific session objects but keep the app authenticated
            setSession(null);
            setUser(null);
          } else {
            // No local token either — this is a genuine logout
            console.log("Genuine logout detected:", event);
            setSession(null);
            setUser(null);
            setRole(null);
            setLocalStorageAuth(false);
          }
          if (mounted) {
            setIsLoading(false);
          }
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Allow login flow to imperatively set auth state before navigating
  // This prevents the blank screen race condition on first login
  const setAuthFromLogin = useCallback((userId: string, newRole: UserRole) => {
    setRole(newRole);
    setLocalStorageAuth(true);
    setIsLoading(false);
  }, []);

  // User is authenticated if either:
  // 1. We have a valid Supabase session, OR
  // 2. We have valid localStorage auth data (for the brief window after redirect)
  const isAuthenticated = !!session?.user || localStorageAuth;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        isLoading,
        isAuthenticated,
        setAuthFromLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
