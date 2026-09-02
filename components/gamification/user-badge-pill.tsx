import { Flame, Medal, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";
import { Badge as BadgeUI } from "@/components/ui/badge";
import type { UserBadgeWithBadge } from "@/types";

// Icon catalog for stored badges. Falls back to Medal for anything not
// listed here, so an admin-added badge with an unrecognized icon slug
// still renders something reasonable instead of crashing.
const ICONS: Record<string, LucideIcon> = { trophy: Trophy, star: Star, flame: Flame, sparkles: Sparkles };

export function UserBadgePill({ userBadge }: { userBadge: UserBadgeWithBadge }) {
  const Icon = ICONS[userBadge.badge.icon] ?? Medal;

  return (
    <BadgeUI variant="accent" className="gap-1.5 py-1" title={userBadge.badge.description}>
      <Icon className="h-3 w-3" />
      {userBadge.badge.label}
    </BadgeUI>
  );
}
