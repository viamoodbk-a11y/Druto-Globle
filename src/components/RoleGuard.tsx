import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DrutoLoader } from "./DrutoLoader";

type UserRole = "customer" | "restaurant_owner" | "admin";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleGuard = ({ children, allowedRoles }: RoleGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role, isLoading } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);
  // Grace period timer ref — prevents acting on a transiently null role
  const roleGraceTimer = useRef<NodeJS.Timeout | null>(null);

  // Compute authorization synchronously to avoid blank screen
  const isAuthorized = useMemo(() => {
    if (isLoading) return false;
    if (!isAuthenticated || !role) return false;
    return allowedRoles.includes(role as UserRole);
  }, [isLoading, isAuthenticated, role, allowedRoles]);

  useEffect(() => {
    // Clear any pending grace period timer when state changes
    if (roleGraceTimer.current) {
      clearTimeout(roleGraceTimer.current);
      roleGraceTimer.current = null;
    }

    // Wait for auth to finish loading
    if (isLoading) return;

    // Already authorized - no redirect needed
    if (isAuthorized) return;

    // Prevent multiple redirects
    if (hasRedirected) return;

    // Auth finished but not authenticated at all
    if (!isAuthenticated) {
      setHasRedirected(true);
      localStorage.setItem("druto_post_auth_redirect", location.pathname);
      navigate("/auth", { replace: true });
      return;
    }

    // User is authenticated but role is still null (transient state during async init).
    // Give it 800ms grace before redirecting — this prevents spurious logouts when
    // the Supabase session briefly expires but druto_auth is still valid.
    if (!role) {
      roleGraceTimer.current = setTimeout(() => {
        if (!role && !hasRedirected) {
          setHasRedirected(true);
          navigate("/auth", { replace: true });
        }
      }, 800);
      return;
    }

    // User has a role but not authorized for this route - redirect to their dashboard
    setHasRedirected(true);
    redirectToDashboard(role as UserRole);
  }, [isLoading, isAuthenticated, role, isAuthorized, allowedRoles, navigate, location.pathname, hasRedirected]);

  // Cleanup grace period timer on unmount
  useEffect(() => {
    return () => {
      if (roleGraceTimer.current) clearTimeout(roleGraceTimer.current);
    };
  }, []);

  const redirectToDashboard = (userRole: UserRole) => {
    switch (userRole) {
      case "admin":
        navigate("/admin", { replace: true });
        break;
      case "restaurant_owner":
        navigate("/owner", { replace: true });
        break;
      case "customer":
      default:
        navigate("/dashboard", { replace: true });
        break;
    }
  };

  // Show loader while auth is loading
  if (isLoading) {
    return <DrutoLoader message="Checking access..." />;
  }

  // User is authorized - render children immediately
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Not authorized and will redirect - show loader during redirect
  return <DrutoLoader message="Redirecting..." />;
};

export default RoleGuard;
