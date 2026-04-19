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
        // Fetch role from DB (now automatically set by the database trigger)
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (roleError || !roleData) {
          console.error("Role missing, retrying in 1s...");
          // If the trigger is still running, retry once
          setTimeout(() => navigate(window.location.pathname, { replace: true }), 1000);
          return;
        }

        const role = roleData.role;

        // Save to local storage for instant dashboard loading
        localStorage.setItem("druto_auth", JSON.stringify({
          isAuthenticated: true,
          userId: userId,
          role: role,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }));

        // Update global auth state immediately to avoid race conditions with RoleGuard
        setAuthFromLogin(userId, role as any);

        // Redirect based on role
        if (role === "restaurant_owner") {
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .maybeSingle();

          navigate(restaurant ? "/owner" : "/onboarding/owner", { replace: true });
        } else if (role === "admin") {
          navigate("/admin", { replace: true });
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
