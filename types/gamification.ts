/**
 * Types for the lightweight gamification layer added on top of the core
 * swap flow (list → match → chat → swap). Mirrors the tables added in
 * `prisma/migrations_manual/0010_gamification_and_cash_removal.sql` and
 * documented in `prisma/schema.prisma`.
 *
 * Two separate currencies live here, on purpose:
 *  - XP: drives level → tier. Never spent, only ever goes up.
 *  - Swap Points: a non-cash currency earned through activity and spent on
 *    cosmetic/priority perks. Never purchasable with real money.
 */

/** Derived from `level` — see `lib/gamification/constants.ts` for the exact
 * level thresholds. Kept as a small, fixed set of tiers (not a raw level
 * number) so the UI never has to explain "what does level 37 mean?". */
export type TraderTier = "bronze" | "silver" | "gold" | "platinum";

/**
 * One row per profile — the whole gamification layer hangs off this. Auto-
 * created (with all-zero defaults) the moment a profile is created, so the
 * rest of the app can assume it always exists rather than null-checking.
 */
export interface GamificationProfile {
  id: string;
  profileId: string;
  xp: number;
  /** Derived from `xp` via `levelForXp()` — stored (not computed on read)
   * so it can be indexed/sorted for leaderboards and perk checks. */
  level: number;
  /** Derived from `level` via `tierForLevel()`. */
  tier: TraderTier;
  /** Spendable balance. Should always equal the running sum of this
   * profile's `PointsTransaction` amounts (earns minus spends). */
  pointsBalance: number;
  /** Consecutive weeks with at least one qualifying action (new listing,
   * a reply, or a completed swap) — resets to 0 the first week with none.
   * Deliberately weekly, not daily, so missing one day doesn't punish
   * casual users. */
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  /** One-time flag guarding the profile-completion XP bonus — internal
   * bookkeeping, not generally something the UI needs to branch on. */
  profileCompletedBonusAwarded: boolean;
  /** Monday (UTC) of the most recent week that counted toward the streak,
   * as an ISO date (`YYYY-MM-DD`). Null until the first qualifying action. */
  lastActivityWeekStart: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PointsTransactionType = "earn" | "spend";

/** What caused a points change. Mirrors the `points_transactions.reason`
 * check constraint. Earn reasons are the activity loop (swaps, streaks,
 * quests, referrals); spend reasons are the redeemable perks in the points
 * shop. `adjustment` covers manual/support corrections in either direction. */
export type PointsTransactionReason =
  | "swap_completed"
  | "streak_milestone"
  | "quest_completed"
  | "referral"
  | "featured_listing_boost"
  | "profile_cosmetic"
  | "priority_match"
  | "category_unlock"
  | "adjustment";

/**
 * One entry in the points ledger. Rows are immutable once written —
 * corrections are new `adjustment` rows, not edits, so `pointsBalance` on
 * `GamificationProfile` is always reconstructable/auditable from history.
 */
export interface PointsTransaction {
  id: string;
  gamificationProfileId: string;
  type: PointsTransactionType;
  reason: PointsTransactionReason;
  /** Always positive; `type` gives the direction. */
  amount: number;
  /** Running balance immediately after this transaction, so the UI can
   * show ledger history without re-summing every row on each render. */
  balanceAfter: number;
  /** The swap this transaction relates to, if any (e.g. `swap_completed`). */
  relatedSwapRequestId: string | null;
  note: string | null;
  createdAt: string;
}

/** A badge definition (the catalog) — an admin-managed reference table,
 * not something a user earns just by existing. Distinct from the ad-hoc
 * `ProfileBadge` in `types/index.ts`, which is computed on the fly from
 * swap/rating counts rather than stored; the two can be reconciled into
 * one system later if useful, but that's a follow-up, not part of this
 * batch. */
export interface Badge {
  id: string;
  slug: string;
  label: string;
  description: string;
  /** Lucide icon name to render alongside the badge. */
  icon: string;
  createdAt: string;
}

/** A badge a specific user has actually earned. */
export interface UserBadge {
  id: string;
  gamificationProfileId: string;
  badgeId: string;
  earnedAt: string;
}

/** A UserBadge joined with the badge it points to — what profile pages
 * actually need to render a badge shelf. */
export interface UserBadgeWithBadge extends UserBadge {
  badge: Badge;
}

export type QuestCadence = "weekly" | "seasonal";

/** A quest definition (the catalog), not an individual user's progress on
 * it — see `UserQuestProgress` for that. */
export interface Quest {
  id: string;
  slug: string;
  title: string;
  description: string;
  cadence: QuestCadence;
  /** Optional launch-category tie-in for seasonal quests, e.g. "Gaming" —
   * matches a value from `LISTING_CATEGORIES` in `lib/constants.ts`. Null
   * for quests open to everyone regardless of category. */
  category: string | null;
  xpReward: number;
  pointsReward: number;
  /** Lets a quest be retired without deleting history that references it. */
  isActive: boolean;
  createdAt: string;
}

export type QuestStatus = "in_progress" | "completed";

/**
 * One user's progress on one instance of a quest. `periodStart` is what
 * lets the *same* quest rotate back in a later week/season as a fresh row,
 * instead of needing a new Quest catalog entry every time.
 */
export interface UserQuestProgress {
  id: string;
  gamificationProfileId: string;
  questId: string;
  status: QuestStatus;
  progressCount: number;
  targetCount: number;
  /** Start (Monday, UTC) of the week/season this instance belongs to, as
   * an ISO date (`YYYY-MM-DD`). */
  periodStart: string;
  completedAt: string | null;
  createdAt: string;
}

export interface UserQuestProgressWithQuest extends UserQuestProgress {
  quest: Quest;
}

// --- Leaderboards -----------------------------------------------------
// Deliberately no stored table for these — see GAMIFICATION.md for where
// the numbers come from. These types describe the shape a leaderboard
// query/view returns, not a persisted row.

export type LeaderboardScope = "global" | "category" | "regional";
export type LeaderboardMetric = "swaps_completed" | "chains_closed" | "on_time_rate";

export interface LeaderboardEntry {
  profileId: string;
  rank: number;
  swapsCompleted: number;
  /** Always 0 until multi-person swap chains (a Future Feature) ship —
   * the column exists now so the leaderboard shape doesn't need to change
   * later. */
  chainsClosed: number;
  /** 0–1. See GAMIFICATION.md for the exact definition. */
  onTimeRate: number;
}

/** What the profile panel's XP bar needs — computed from `xp` via
 * `getLevelProgress()` in `lib/gamification/constants.ts` rather than
 * stored, so retuning the level thresholds doesn't require a migration. */
export interface LevelProgress {
  level: number;
  tier: TraderTier;
  /** XP earned since the start of the current level. */
  xpIntoLevel: number;
  /** XP needed to go from the current level to the next one. Null at the
   * top defined level — there's nothing further to progress toward. */
  xpForNextLevel: number | null;
  /** 0–1, for a progress bar. 1 (full) at the top defined level. */
  progressFraction: number;
}
