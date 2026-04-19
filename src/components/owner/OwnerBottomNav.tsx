import { memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutGrid, Users, Gift, Settings, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOwnerData } from "@/hooks/useOwnerData";

interface OwnerBottomNavProps {
  pendingRewardsCount?: number;
  pendingScansCount?: number;
}

const OwnerBottomNav = memo(({ pendingRewardsCount = 0, pendingScansCount = 0 }: OwnerBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const currentTab = params.get("tab") || "overview";

  const { restaurant } = useOwnerData();
  const isBorcella = restaurant?.name?.toLowerCase().includes("borcella");

  const navItems = [
    { key: "overview", label: "Home", icon: LayoutGrid, badge: pendingScansCount },
    { key: "customers", label: "Customers", icon: Users },
    { key: "rewards", label: "Rewards", icon: Gift, badge: pendingRewardsCount },
    ...(isBorcella ? [{ key: "marketing", label: "Marketing", icon: Megaphone }] : []),
    { key: "settings", label: "Create Offer", icon: Settings },
  ];

  const handleNavClick = (key: string) => {
    navigate(`/owner?tab=${key}`, { replace: true });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/50 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all relative group",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}

              {/* Icon container */}
              <div className={cn(
                "relative flex items-center justify-center w-10 h-7 rounded-full transition-colors",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "h-[22px] w-[22px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />

                {/* Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

OwnerBottomNav.displayName = "OwnerBottomNav";

export { OwnerBottomNav };
