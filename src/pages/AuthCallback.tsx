import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DrutoLoader } from "@/components/DrutoLoader";
import { useAuth } from "@/contexts/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { setAuthFromLogin } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // More robust session retrieval with retries to handle race conditions
      // sometimes getSession() returns null immediately after redirection
      let session = null;
      let retries = 0;
      const maxRetries = 5;

      // Check for code in URL (PKCE flow)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const errorDescription = params.get("error_description");
      
      console.log("Auth callback URL state:", { 
        hasCode: !!code, 
        hasHash: !!window.location.hash,
        error,
        errorDescription,
        origin: window.location.origin,
        pathname: window.location.pathname
      });

      if (error) {
        console.error("Supabase Auth Error:", error, errorDescription);
        navigate("/auth", { replace: true });
        return;
      }

      while (!session && retries < maxRetries) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          session = data.session;
          break;
        }
        retries++;
        console.log(`Session discovery attempt ${retries}/5...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!session) {
        console.error("Auth callback: No session found after retries. Redirecting to login.");
        navigate("/auth", { replace: true });
        return;
      }

      const userId = session.user.id;

      try {
        // Fetch all roles for the user to handle multi-role accounts
        // We retry role fetching specifically to wait for the DB trigger if it's lagging
        let roles = null;
        let rolesError = null;
        let roleAttempts = 0;

        while (roleAttempts < 3) {
          const { data, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          
          if (!error && data && data.length > 0) {
            roles = data;
            break;
          }
          
          rolesError = error;
          roleAttempts++;
          console.log(`Role fetch attempt ${roleAttempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        if (!roles || roles.length === 0) {
          console.error("Role missing after retries:", rolesError);
          // If still no role, default to customer to avoid getting stuck
          // if they are actually an owner, they can fix it in onboarding
          console.log("Fallback to customer role");
          roles = [{ role: "customer" }];
        }

        // Prioritize roles: admin > restaurant_owner > customer
        const roleList = roles.map(r => r.role);
        let role: string;
        
        if (roleList.includes("admin")) {
          role = "admin";
        } else if (roleList.includes("restaurant_owner")) {
          role = "restaurant_owner";
        } else {
          role = "customer";
        }

        console.log("Determined role:", role);

        // Save to local storage for instant dashboard loading
        localStorage.setItem("druto_auth", JSON.stringify({
          isAuthenticated: true,
          userId: userId,
          role: role,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));

        // Update global auth state immediately
        setAuthFromLogin(userId, role as any);

        // Redirect based on prioritized role
        if (role === "admin") {
          navigate("/admin", { replace: true });
        } else if (role === "restaurant_owner") {
          // Check if onboarding is needed
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .maybeSingle();

          navigate(restaurant ? "/owner" : "/onboarding/owner", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error during role processing:", err);
        navigate("/dashboard", { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, setAuthFromLogin]);

  return <DrutoLoader message="Verifying your account..." />;
};

export default AuthCallback;
