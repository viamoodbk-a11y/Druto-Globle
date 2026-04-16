import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DrutoLoader } from "@/components/DrutoLoader";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error("Auth callback error:", error);
        navigate("/auth", { replace: true });
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const userType = params.get("user_type");
      const userId = session.user.id;

      try {
        // Check if user already has a role
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        let finalRole = existingRole?.role;

        // If no role exists, set it based on the user_type param
        if (!finalRole && userType) {
          const newRole = userType === "owner" ? "restaurant_owner" : "customer";
          
          const { error: insertError } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: newRole });

          if (!insertError) {
            finalRole = newRole;
            // Update local storage to prevent blank screen race condition
            localStorage.setItem("druto_auth", JSON.stringify({
              isAuthenticated: true,
              userId: userId,
              role: newRole,
              expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
            }));
          }
        }

        // Redirect to appropriate dashboard or onboarding
        if (finalRole === "restaurant_owner") {
          // Check if they have a restaurant profile
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .maybeSingle();

          if (restaurant) {
            navigate("/owner", { replace: true });
          } else {
            navigate("/onboarding/owner", { replace: true });
          }
        } else if (finalRole === "admin") {
          navigate("/admin", { replace: true });
        } else {
          // Default to customer
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Error in auth callback processing:", err);
        navigate("/dashboard", { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <DrutoLoader message="Completing sign in..." />;
};

export default AuthCallback;
