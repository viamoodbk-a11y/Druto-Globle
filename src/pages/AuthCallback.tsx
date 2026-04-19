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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }

      const userId = session.user.id;

      try {
        // Fetch all roles for the user to handle multi-role accounts
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        if (rolesError || !roles || roles.length === 0) {
          console.error("Role missing, retrying in 1s...", rolesError);
          // If the trigger is still running, retry once
          setTimeout(() => navigate(window.location.pathname, { replace: true }), 1000);
          return;
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
        console.error("Auth callback error:", err);
        navigate("/dashboard", { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, setAuthFromLogin]);

  return <DrutoLoader message="Verifying your account..." />;
};

export default AuthCallback;
