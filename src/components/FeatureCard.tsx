import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}

export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  className,
  delay = 0,
}: FeatureCardProps) => {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card p-6 shadow-soft transition-all duration-300 hover:shadow-card hover:-translate-y-1",
        "opacity-0 animate-slide-up",
        className
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

      {/* Decorative gradient */}
      <div className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full bg-primary/5 transition-all duration-300 group-hover:scale-150" />
    </div>
  );
};
