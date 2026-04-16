import { memo, useMemo, useCallback } from "react";
import { Home, QrCode, User, Gift, Compass, LayoutDashboard, Users, Trophy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NavItemData {
  icon: typeof Home;
  label: string;
  path: string;
  isMain?: boolean;
}

interface BottomNavProps {
  userType?: "customer" | "owner";
}

const customerNavItems: NavItemData[] = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: QrCode, label: "Scan", path: "/scan", isMain: true },
  { icon: Gift, label: "Reward", path: "/rewards" },
  { icon: User, label: "Profile", path: "/profile" },
];

const ownerNavItems: NavItemData[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/owner" },
  { icon: Users, label: "Customers", path: "/owner?tab=customers" },
  { icon: QrCode, label: "QR Code", path: "/owner?tab=overview", isMain: true },
  { icon: Gift, label: "Offer", path: "/owner?tab=settings" },
  { icon: Trophy, label: "Rewards", path: "/owner?tab=rewards" },
];

// Memoized NavItem component for performance
const NavItem = memo(({
  icon: Icon,
  label,
  isActive,
  onClick,
  onMouseEnter,
  onTouchStart
}: {
  icon: typeof Home;
  label: string;
  isActive: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onTouchStart?: () => void;
}) => (
  <button
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onTouchStart={onTouchStart}
    className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-2 transition-colors duration-150"
  >
    <Icon
      className={cn(
        "h-[22px] w-[22px] transition-colors duration-150",
        isActive ? "text-primary transition-all scale-110" : "text-muted-foreground/70"
      )}
      fill={isActive ? "currentColor" : "none"}
      strokeWidth={isActive ? 0 : 2}
    />
    <span className={cn(
      "text-[10px] font-bold leading-tight transition-colors duration-150 uppercase tracking-tighter",
      isActive ? "text-primary" : "text-muted-foreground/70"
    )}>
      {label}
    </span>
  </button>
));

NavItem.displayName = "NavItem";

// Memoized NavGroup component (pill container)
const NavGroup = memo(({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn(
    "flex items-center bg-card/95 backdrop-blur-md border border-border/50 rounded-full px-3 py-1 shadow-card",
    className
  )}>
    {children}
  </div>
));

NavGroup.displayName = "NavGroup";

// Memoized ScanButton component
const ScanButton = memo(({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="relative flex items-center justify-center -mt-6"
  >
    {/* Single centered button with white ring */}
    <div className="h-[68px] w-[68px] rounded-full bg-card shadow-card flex items-center justify-center border border-border/50">
      <div className="h-[58px] w-[58px] rounded-full bg-primary flex items-center justify-center shadow-glow">
        {/* QR Code icon pattern */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          className="text-white"
        >
          {/* Top-left corner bracket */}
          <path d="M3 7V5C3 3.89543 3.89543 3 5 3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Top-right corner bracket */}
          <path d="M17 3H19C20.1046 3 21 3.89543 21 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Bottom-left corner bracket */}
          <path d="M3 17V19C3 20.1046 3.89543 21 5 21H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Bottom-right corner bracket */}
          <path d="M17 21H19C20.1046 21 21 20.1046 21 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

          {/* QR pattern squares */}
          <rect x="7" y="7" width="3" height="3" fill="currentColor" rx="0.5" />
          <rect x="14" y="7" width="3" height="3" fill="currentColor" rx="0.5" />
          <rect x="7" y="14" width="3" height="3" fill="currentColor" rx="0.5" />
          <rect x="11" y="11" width="2" height="2" fill="currentColor" rx="0.25" />
          <rect x="14" y="14" width="3" height="3" fill="currentColor" rx="0.5" />
        </svg>
      </div>
    </div>
  </button>
));

ScanButton.displayName = "ScanButton";

// Main BottomNav component
export const BottomNav = memo(({ userType = "customer" }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = useMemo(() =>
    userType === "owner" ? ownerNavItems : customerNavItems,
    [userType]
  );

  const queryClient = useQueryClient();

  const isActiveRoute = useCallback((itemPath: string) => {
    if (itemPath.includes("?")) {
      const [basePath, query] = itemPath.split("?");
      return location.pathname === basePath && location.search.includes(query.split("=")[1]);
    }
    return location.pathname === itemPath;
  }, [location.pathname, location.search]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const prefetchPage = useCallback((path: string) => {
    const authData = localStorage.getItem("druto_auth");
    const userId = authData ? JSON.parse(authData).userId : null;

    if (path === "/explore") {
      queryClient.prefetchQuery({ queryKey: ["explore-restaurants"] });
    } else if (path === "/rewards") {
      queryClient.prefetchQuery({ queryKey: ["rewards-data"] });
    } else if (path === "/profile") {
      queryClient.prefetchQuery({ queryKey: ["profile-data"] });
    } else if (path === "/dashboard") {
      queryClient.prefetchQuery({ queryKey: ["customer-data"] });
    }
  }, [queryClient]);

  // Split items into left, center (scan), and right groups
  const leftItems = navItems.filter((_, i) => i < 2);
  const scanItem = navItems.find(item => item.isMain);
  const rightItems = navItems.filter((_, i) => i > 2);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Transparent container */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-end justify-between max-w-md mx-auto">
          {/* Left group - Home & Explore */}
          <NavGroup>
            {leftItems.map((item) => (
              <NavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                isActive={isActiveRoute(item.path)}
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => prefetchPage(item.path)}
                onTouchStart={() => prefetchPage(item.path)}
              />
            ))}
          </NavGroup>

          {/* Center - Scan button */}
          {scanItem && (
            <ScanButton onClick={() => handleNavigate(scanItem.path)} />
          )}

          {/* Right group - Reward & Profile */}
          <NavGroup>
            {rightItems.map((item) => (
              <NavItem
                key={item.path}
                icon={item.icon}
                label={item.label}
                isActive={isActiveRoute(item.path)}
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => prefetchPage(item.path)}
                onTouchStart={() => prefetchPage(item.path)}
              />
            ))}
          </NavGroup>
        </div>
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
