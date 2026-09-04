import Link from "next/link";
import { Coins } from "lucide-react";
import { TierBadge } from "@/components/gamification/tier-badge";
import type { GamificationProfile } from "@/types";

interface HeaderGamificationPillProps {
  gamification: GamificationProfile;
}

/** Small, always-on indicator in the navbar — tier + points balance, tap
 * through to the full breakdown on the profile page. Deliberately compact:
 * this is the "optional to notice" surface, not the deep-dive one. */
export function HeaderGamificationPill({ gamification }: HeaderGamificationPillProps) {
  return (
    <Link
      href="/profile"
      className="hidden items-center gap-2 rounded-full border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
      title={`Level ${gamification.level} · ${gamification.pointsBalance} points`}
    >
      <TierBadge tier={gamification.tier} iconOnly />
      <span className="flex items-center gap-1">
        <Coins className="h-3.5 w-3.5" />
        {gamification.pointsBalance}
      </span>
    </Link>
  );
}