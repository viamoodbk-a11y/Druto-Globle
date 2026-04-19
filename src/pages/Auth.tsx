import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import drutoLogo from "@/assets/druto-logo-gift.png";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, role, isLoading: authLoading } = useAuth();
  const isOwner = searchParams.get("type") === "owner";
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<"customer" | "owner">(
    isOwner ? "owner" : "customer"
  );

  // Redirect already authenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated && role) {
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "restaurant_owner") navigate("/owner", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, role, navigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    // Store pending user type in localStorage as a bulletproof backup 
    // because URL parameters and OAuth metadata are unreliable for existing users
    localStorage.setItem("druto_pending_type", userType);
    console.log("Stored pending user type:", userType);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=${userType}`,
          data: {
            user_type: userType,
            type: userType,
            role: userType,
            registration_user_type: userType
          }
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF8ED] text-[#1A1A1A] flex flex-col items-center justify-between p-8 md:p-12 selection:bg-red-100 overflow-x-hidden font-sans">
      {/* Top Bar Progress */}
      <div className="w-full max-w-md flex items-center justify-start gap-2 mb-8">
        <div className="h-1.5 w-12 bg-[#8B0000] rounded-full" />
        <div className="h-1.5 w-1.5 bg-[#E5E5E5] rounded-full" />
        <div className="h-1.5 w-1.5 bg-[#E5E5E5] rounded-full" />
      </div>

      <div className="w-full max-w-md flex-1 flex flex-col justify-center gap-10 md:gap-14">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-[36px] md:text-[42px] font-bold leading-tight tracking-tight text-[#1A1A1A]">
            Grow your business with loyalty! {userType === 'owner' ? '🏨' : '✨'}
          </h1>
          <p className="text-[#666666] text-lg leading-relaxed max-w-[300px]">
            {userType === "customer" 
              ? "Sign in to access your rewards" 
              : "Sign in to set up your loyalty program"}
          </p>
        </div>

        {/* User Type Selector */}
        <div className="p-1.5 bg-[#F5F1E6] rounded-[24px] flex w-fit min-w-[300px]">
          <button
            onClick={() => setUserType("customer")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-[20px] text-sm font-semibold transition-all duration-300 ${
              userType === "customer" 
              ? "bg-white text-[#1A1A1A] shadow-sm" 
              : "text-[#807D75] hover:text-[#1A1A1A]"
            }`}
          >
            <span className="text-base">✨</span> Customer
          </button>
          <button
            onClick={() => setUserType("owner")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-[20px] text-sm font-semibold transition-all duration-300 ${
              userType === "owner" 
              ? "bg-white text-[#1A1A1A] shadow-sm" 
              : "text-[#807D75] hover:text-[#1A1A1A]"
            }`}
          >
            <span className="text-base">🏨</span> Business
          </button>
        </div>

        {/* Google Login Section */}
        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-[56px] flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-[#3c4043] border border-[#DADCE0] rounded-[16px] font-semibold text-lg shadow-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p className="text-center text-[13px] leading-relaxed text-[#807D75]">
            By proceeding, you agree to Druto's{" "}
            <Link to="/legal?section=terms" className="text-[#8B0000] hover:underline font-bold">T&C</Link>
            {" "}and{" "}
            <Link to="/legal?section=privacy" className="text-[#8B0000] hover:underline font-bold">Privacy Policy</Link>
          </p>
        </div>
      </div>

      {/* Footer Logo */}
      <div className="pt-8 opacity-[0.05] hover:opacity-[0.1] transition-opacity">
        <img src={drutoLogo} alt="" className="h-10 w-auto brightness-0" />
      </div>
    </div>
  );
};

export default Auth;
