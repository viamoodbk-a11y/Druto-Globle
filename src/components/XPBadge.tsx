import { cn } from "@/lib/utils";
import { Star, TrendingUp, Gift, Flame } from "lucide-react";

interface XPBadgeProps {
  totalVisits: number;
  rewardsEarned: number;
  activeCards: number;
  streak?: number;
}

const getLevel = (visits: number) => {
  if (visits >= 100) return { level: 5, title: "Legend", icon: "👑", color: "text-yellow-500" };
  if (visits >= 50) return { level: 4, title: "Champion", icon: "🏆", color: "text-purple-500" };
  if (visits >= 25) return { level: 3, title: "Regular", icon: "⭐", color: "text-primary" };
  if (visits >= 10) return { level: 2, title: "Explorer", icon: "🚀", color: "text-accent" };
  return { level: 1, title: "Newbie", icon: "🌱", color: "text-green-500" };
};

export const XPBadge = ({ totalVisits, rewardsEarned, activeCards, streak = 3 }: XPBadgeProps) => {
  const { level, title, icon, color } = getLevel(totalVisits);
  const nextLevelVisits = level === 5 ? totalVisits : [10, 25, 50, 100][level - 1];
  const prevLevelVisits = level === 1 ? 0 : [0, 10, 25, 50][level - 1];
  const progress = ((totalVisits - prevLevelVisits) / (nextLevelVisits - prevLevelVisits)) * 100;

  return (
    <div className="rounded-2xl gradient-primary p-4 text-primary-foreground">
      <div className="flex items-center justify-between mb-3">
        {/* Level badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground/20 text-2xl animate-float">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Level {level}</span>
              <span className="text-primary-foreground/70">•</span>
              <span className="text-sm text-primary-foreground/80">{title}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary-foreground/70">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{totalVisits} XP</span>
            </div>
          </div>
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5">
            <Flame className="h-4 w-4 text-orange-300" />
            <span className="text-sm font-bold">{streak} day</span>
          </div>
        )}
      </div>

      {/* Level progress */}
      {level < 5 && (
        <div className="mb-3">
          <div className="h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
            <div 
              className="h-full bg-primary-foreground rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-primary-foreground/60 mt-1">
            {nextLevelVisits - totalVisits} XP to next level
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
          <Gift className="h-4 w-4 mx-auto mb-1 text-primary-foreground/80" />
          <span className="block text-lg font-bold">{rewardsEarned}</span>
          <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wide">Rewards</span>
        </div>
        <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
          <Star className="h-4 w-4 mx-auto mb-1 text-primary-foreground/80" />
          <span className="block text-lg font-bold">{activeCards}</span>
          <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wide">Active</span>
        </div>
        <div className="rounded-xl bg-primary-foreground/10 p-2.5 text-center">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary-foreground/80" />
          <span className="block text-lg font-bold">{totalVisits}</span>
          <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wide">Visits</span>
        </div>
      </div>
    </div>
  );
};
