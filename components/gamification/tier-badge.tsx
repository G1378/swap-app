import { Award, Gem, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TraderTier } from "@/types";

const TIER_CONFIG: Record<
  TraderTier,
  { label: string; icon: typeof Medal; className: string }
> = {
  bronze: {
    label: "Bronze",
    icon: Medal,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  },
  silver: {
    label: "Silver",
    icon: Award,
    className: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  gold: {
    label: "Gold",
    icon: Trophy,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  platinum: {
    label: "Platinum",
    icon: Gem,
    className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
};

interface TierBadgeProps {
  tier: TraderTier;
  /** "sm" is icon + label in a tight pill (member cards, header pill).
   * "md" is a bit more breathing room for the profile panel. */
  size?: "sm" | "md";
  /** Icon only, no text — for very tight spaces. */
  iconOnly?: boolean;
  className?: string;
}

export function TierBadge({ tier, size = "sm", iconOnly = false, className }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        config.className,
        className
      )}
      title={`${config.label} tier`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {!iconOnly && config.label}
    </span>
  );
}
