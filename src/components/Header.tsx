import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Store, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import drutoLogo from "@/assets/druto-logo-new.png";

interface HeaderProps {
  isLoggedIn?: boolean;
  userType?: "customer" | "owner";
  onLogout?: () => void;
}

export const Header = ({ isLoggedIn: isLoggedInProp, userType: userTypeProp, onLogout }: HeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authState, setAuthState] = useState<{ isLoggedIn: boolean; userType?: "customer" | "owner" }>({
    isLoggedIn: false,
    userType: undefined,
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Check auth state from localStorage
  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem("druto_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          setAuthState({
            isLoggedIn: parsed.isAuthenticated || false,
            userType: parsed.userType,
          });
        } catch {
          setAuthState({ isLoggedIn: false, userType: undefined });
        }
      } else {
        setAuthState({ isLoggedIn: false, userType: undefined });
      }
    };
    
    checkAuth();
    // Listen for storage changes
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, [location]);

  const isLoggedIn = isLoggedInProp ?? authState.isLoggedIn;
  const userType = userTypeProp ?? authState.userType;

  const handleLogout = () => {
    localStorage.removeItem("druto_auth");
    setAuthState({ isLoggedIn: false, userType: undefined });
    onLogout?.();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link 
          to={isLoggedIn ? (userType === "owner" ? "/owner" : "/dashboard") : "/"} 
          className="flex items-center gap-2"
        >
          <img src={drutoLogo} alt="Druto" className="h-10 w-10 rounded-xl object-cover" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-4 md:flex">
          {isLoggedIn ? (
            <>
              {userType === "customer" && (
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    My Rewards
                  </Button>
                </Link>
              )}
              {userType === "owner" && (
                <Link to="/owner">
                  <Button variant="ghost" size="sm">
                    <Store className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <Link to={userType === "owner" ? "/owner/profile" : "/profile"}>
                <Button variant="outline" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/auth?type=owner">
                <Button variant="hero" size="sm">
                  For Businesses
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "absolute left-0 right-0 top-16 border-b border-border bg-background p-4 md:hidden transition-all duration-300",
          mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <div className="flex flex-col gap-2">
          {isLoggedIn ? (
            <>
              {userType === "customer" && (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" />
                    My Rewards
                  </Button>
                </Link>
              )}
              {userType === "owner" && (
                <Link to="/owner" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Store className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <Link to={userType === "owner" ? "/owner/profile" : "/profile"} onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Login
                </Button>
              </Link>
              <Link to="/auth?type=owner" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="hero" className="w-full">
                  For Businesses
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
