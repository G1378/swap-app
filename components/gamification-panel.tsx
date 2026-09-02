import { Flame, Coins } from "lucide-react";
import { TierBadge } from "@/components/gamification/tier-badge";
import { UserBadgePill } from "@/components/gamification/user-badge-pill";
import { getLevelProgress } from "@/lib/gamification/constants";
import type { GamificationProfile, UserBadgeWithBadge } from "@/types";

interface GamificationPanelProps {
  gamification: GamificationProfile;
  badges: UserBadgeWithBadge[];
  /** Points balance is only shown on your own profile — everything else
   * here (tier, level, streak, badges) is public, same as ratings. */
  isOwnProfile: boolean;
}

export function GamificationPanel({ gamification, badges, isOwnProfile }: GamificationPanelProps) {
  const progress = getLevelProgress(gamification.xp);

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TierBadge tier={gamification.tier} size="md" />
          <span className="text-sm font-medium text-muted-foreground">Level {progress.level}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {gamification.currentStreakWeeks > 0 && (
            <span className="flex items-center gap-1" title="Consecutive active weeks">
              <Flame className="h-4 w-4 text-orange-500" />
              {gamification.currentStreakWeeks}-week streak
            </span>
          )}
          {isOwnProfile && (
            <span className="flex items-center gap-1" title="Swap Points — earned through activity, never purchased">
              <Coins className="h-4 w-4" />
              {gamification.pointsBalance} points
            </span>
          )}
        </div>
      </div>

      {/* XP progress toward next level */}
      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round(progress.progressFraction * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {progress.xpForNextLevel === null
            ? `${gamification.xp} XP · top level`
            : `${progress.xpIntoLevel} / ${progress.xpForNextLevel} XP to level ${progress.level + 1}`}
        </p>
      </div>

      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((userBadge) => (
            <UserBadgePill key={userBadge.id} userBadge={userBadge} />
          ))}
        </div>
      )}
    </div>
  );
}
