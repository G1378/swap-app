import { Flame } from "lucide-react";
import { getLevelProgress } from "@/lib/gamification/constants";
import { TierBadge } from "@/components/gamification/tier-badge";
import type { GamificationProfile } from "@/types";

interface StreakXpBarProps {
  gamification: GamificationProfile | null;
  /** 0-based index of the current card, for the "3 / 42" position pill
   * this bar now owns (previously a separate absolutely-positioned pill
   * in DiscoverReel — folded in here so the reel's top edge has one
   * overlay, not two competing for the same corner). */
  index: number;
  total: number;
}

/**
 * Full-width overlay pinned to the top of the Discover reel. Deliberately
 * loud relative to the old header pill (see HeaderGamificationPill) — the
 * reel is the screen people open the app for, so it's where the reward
 * layer earns the most attention per the "Duolingo-style, front and
 * center" design direction, rather than being something you only notice
 * by clicking through to /profile.
 *
 * Renders nothing beyond the position pill for logged-out visitors — the
 * gamification layer only exists once someone has an account.
 */
export function StreakXpBar({ gamification, index, total }: StreakXpBarProps) {
  const progress = gamification ? getLevelProgress(gamification.xp) : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent p-4">
      <span className="pointer-events-auto shrink-0 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {index + 1} / {total}
      </span>

      {gamification && progress && (
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {gamification.currentStreakWeeks > 0 && (
              <span
                className="flex items-center gap-1 rounded-full bg-reward-soft px-2.5 py-1 text-xs font-semibold text-reward-soft-foreground"
                title={`${gamification.currentStreakWeeks} week streak`}
              >
                <Flame className="h-3.5 w-3.5" />
                {gamification.currentStreakWeeks}w streak
              </span>
            )}
            <TierBadge
              tier={gamification.tier}
              size="sm"
              className="bg-white/90"
            />
          </div>

          <div className="flex w-32 flex-col gap-0.5">
            <div className="flex items-center justify-between text-[10px] font-medium text-white/80">
              <span>Level {gamification.level}</span>
              {progress.xpForNextLevel !== null && (
                <span>
                  {progress.xpIntoLevel} / {progress.xpForNextLevel} xp
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-reward transition-all"
                style={{
                  width: `${Math.round(progress.progressFraction * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
