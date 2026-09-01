import type { TraderTier } from "@/types";

/**
 * Single source of truth for gamification tuning: XP awards, level/tier
 * thresholds, points-earning amounts, and points-spending costs. Keeping
 * every number here (not scattered across API routes or components) means
 * changing "how much is a swap worth" is a one-line edit, and keeps the
 * numbers testable in isolation.
 *
 * None of this file talks to the database — it's pure, deterministic
 * config + helper functions. Awarding XP/points on real events (a swap
 * completing, a rating landing within 24h, etc.) is application-layer
 * wiring that's intentionally out of scope for this batch; see
 * GAMIFICATION.md for what's stubbed vs. wired up.
 */

// --- XP -------------------------------------------------------------------

/** XP awarded per triggering action. */
export const XP_AWARDS = {
  /** Completing a swap — awarded to both sides, once each. */
  SWAP_COMPLETED: 50,
  /** Leaving a rating within 24h of the swap it's for completing. */
  RATING_WITHIN_24H: 10,
  /** Completing your profile. One-time only — track with a boolean/flag at
   * the call site so a repeat "completion" doesn't re-award it. */
  PROFILE_COMPLETED: 20,
  /** Each leg of a completed multi-person swap chain. Multi-way matching is
   * a Future Feature (not yet built), so this constant is inert until then
   * — defined now so the reward doesn't need revisiting later. */
  CHAIN_LEG_COMPLETED: 20,
  /** A referral that converts into a signed-up, active user. */
  SUCCESSFUL_REFERRAL: 15,
} as const;

/**
 * XP required to *reach* each level. `LEVEL_XP_THRESHOLDS[i]` is the XP
 * floor for level `i + 1` — level 1 starts at 0 XP, everyone begins there.
 * Deliberately few, coarse levels: the UI only ever needs to show *tier*
 * (4 options), not the raw level number, so precision beyond "roughly how
 * active is this person" isn't needed.
 */
export const LEVEL_XP_THRESHOLDS: readonly number[] = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  500, // Level 4 — Silver starts here
  900, // Level 5
  1400, // Level 6
  2000, // Level 7 — Gold starts here
  2800, // Level 8
  3800, // Level 9
  5000, // Level 10 — Platinum starts here (no ceiling above this)
];

/** The level at which each tier begins. Only 4 tiers on purpose — "prefer
 * 3-4 clear tiers over granular scoring the user has to think about." */
export const TIER_LEVEL_FLOORS: Record<TraderTier, number> = {
  bronze: 1,
  silver: 4,
  gold: 7,
  platinum: 10,
};

/** Maps total XP to a level, using `LEVEL_XP_THRESHOLDS`. XP beyond the
 * last threshold keeps you at the top defined level (Platinum) — there's
 * no cap on *earning* XP, just on how many distinct levels are named. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

/** Maps a level to its tier via `TIER_LEVEL_FLOORS`. */
export function tierForLevel(level: number): TraderTier {
  if (level >= TIER_LEVEL_FLOORS.platinum) return "platinum";
  if (level >= TIER_LEVEL_FLOORS.gold) return "gold";
  if (level >= TIER_LEVEL_FLOORS.silver) return "silver";
  return "bronze";
}

/** Convenience wrapper: XP straight to tier, for call sites that don't
 * otherwise need the intermediate level number. */
export function tierForXp(xp: number): TraderTier {
  return tierForLevel(levelForXp(xp));
}

// --- Tier perks -------------------------------------------------------
// Documentation-as-data: what each tier unlocks. Each perk is *enforced*
// wherever it actually lives (the listing-cap check, the search ranking
// query, the featured-listing redemption flow, the category-launch gate)
// — this map is the readable summary, not the enforcement point.

export interface TierPerks {
  /** Additional active listings allowed beyond the base cap. */
  listingCapBonus: number;
  /** Coarse search-priority boost, higher = more priority. 0 = none. */
  searchPriorityBoost: 0 | 1 | 2 | 3;
  /** One free featured-listing redemption per calendar month. */
  freeFeaturedListingMonthly: boolean;
  /** Can list into a newly-launched category before it opens to everyone. */
  earlyCategoryAccess: boolean;
}

export const TIER_PERKS: Record<TraderTier, TierPerks> = {
  bronze: {
    listingCapBonus: 0,
    searchPriorityBoost: 0,
    freeFeaturedListingMonthly: false,
    earlyCategoryAccess: false,
  },
  silver: {
    listingCapBonus: 2,
    searchPriorityBoost: 1,
    freeFeaturedListingMonthly: false,
    earlyCategoryAccess: false,
  },
  gold: {
    listingCapBonus: 5,
    searchPriorityBoost: 2,
    freeFeaturedListingMonthly: true,
    earlyCategoryAccess: false,
  },
  platinum: {
    listingCapBonus: 10,
    searchPriorityBoost: 3,
    freeFeaturedListingMonthly: true,
    earlyCategoryAccess: true,
  },
};

// --- Swap Points (non-cash currency) --------------------------------------
// A separate pool from XP: XP only ever goes up and drives level/tier;
// points are a spendable balance. Earned only through activity — never
// purchasable with real money, and never usable to balance an uneven trade.

/** Points earned per triggering action. */
export const POINTS_AWARDS = {
  SWAP_COMPLETED: 20,
  /** Awarded once per streak "milestone" (e.g. every 4 consecutive weeks),
   * not every single week — see GAMIFICATION.md. */
  STREAK_MILESTONE: 15,
  QUEST_COMPLETED: 25,
  SUCCESSFUL_REFERRAL: 30,
} as const;

/** Points cost per redeemable perk. */
export const POINTS_COSTS = {
  /** Bumps a listing to the top of Discover for 24h. */
  FEATURED_LISTING_BOOST_24H: 150,
  /** A profile cosmetic (badge frame, accent color, etc.). */
  PROFILE_COSMETIC: 75,
  /** Flags one active swap request as "priority" for the receiver's queue. */
  PRIORITY_MATCH_FLAG: 100,
  /** Unlocks a not-yet-public launch category early (mirrors the Platinum
   * tier perk, but purchasable with points below Platinum). */
  CATEGORY_EARLY_UNLOCK: 250,
} as const;

/** How many consecutive weeks of streak between each `STREAK_MILESTONE`
 * points award. */
export const STREAK_MILESTONE_INTERVAL_WEEKS = 4;
