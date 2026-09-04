import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapGamificationProfileRow,
  mapUserBadgeWithBadgeRow,
  mapUserQuestProgressWithQuestRow,
} from "@/lib/mappers";
import type { GamificationProfile, UserBadgeWithBadge, UserQuestProgressWithQuest } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/**
 * Reads for the gamification layer, plus thin wrappers around the
 * SECURITY DEFINER RPCs added in
 * prisma/migrations_manual/0011_gamification_wiring.sql. Direct writes to
 * gamification_profiles/points_transactions/user_quest_progress are
 * blocked by RLS on purpose — these RPCs are the only way XP, points, and
 * quest progress can change. Every RPC call here is best-effort: it logs
 * on failure rather than throwing, since none of them should ever block
 * the primary action (sending a message, completing a swap, etc.) that
 * triggered them.
 */

export async function getGamificationProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<GamificationProfile | null> {
  const { data } = await supabase
    .from("gamification_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  return data ? mapGamificationProfileRow(data) : null;
}

/** Batch version — one query for a whole page of profiles (e.g. a member
 * directory) instead of one per card. Keyed by profileId, not the
 * gamification_profiles row id. */
export async function getGamificationProfilesByProfileIds(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, GamificationProfile>> {
  if (profileIds.length === 0) return new Map();

  const { data } = await supabase.from("gamification_profiles").select("*").in("profile_id", profileIds);

  const result = new Map<string, GamificationProfile>();
  for (const row of (data as Row[]) ?? []) {
    const profile = mapGamificationProfileRow(row);
    result.set(profile.profileId, profile);
  }
  return result;
}

export async function getUserBadges(
  supabase: SupabaseClient,
  gamificationProfileId: string
): Promise<UserBadgeWithBadge[]> {
  const { data } = await supabase
    .from("user_badges")
    .select("*, badge:badges(*)")
    .eq("gamification_profile_id", gamificationProfileId)
    .order("earned_at", { ascending: false });

  return ((data as Row[]) ?? []).map(mapUserBadgeWithBadgeRow);
}

// --- Week/month period boundaries -----------------------------------------
// Mirror Postgres's date_trunc('week', ...) (Monday-based, ISO) and
// date_trunc('month', ...) so the read side filters to exactly the rows
// refresh_quest_board() just provisioned. This is the only piece of the
// rotation logic duplicated client-side — which *quests* rotate in each
// week is decided entirely server-side (see refresh_quest_board() in the
// migration), so there's nothing else to keep in sync here.

function getWeekStartISO(date = new Date()): string {
  const day = date.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - diffToMonday));
  return monday.toISOString().slice(0, 10);
}

function getMonthStartISO(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export interface QuestBoard {
  weekly: UserQuestProgressWithQuest[];
  seasonal: UserQuestProgressWithQuest[];
}

/**
 * The signed-in user's quest board for the current week/month. Calls
 * refresh_quest_board() first (provisions any missing rows for this
 * period), then reads back exactly what that provisioned — this is why
 * the client doesn't need to know the weekly rotation math, only "what is
 * the current period start."
 */
export async function getQuestBoard(supabase: SupabaseClient, gamificationProfileId: string): Promise<QuestBoard> {
  const { error: refreshError } = await supabase.rpc("refresh_quest_board");
  if (refreshError) {
    console.error("Failed to refresh quest board:", refreshError.message);
  }

  const weekStart = getWeekStartISO();
  const monthStart = getMonthStartISO();

  const [weeklyRes, seasonalRes] = await Promise.all([
    supabase
      .from("user_quest_progress")
      .select("*, quest:quests(*)")
      .eq("gamification_profile_id", gamificationProfileId)
      .eq("period_start", weekStart),
    supabase
      .from("user_quest_progress")
      .select("*, quest:quests(*)")
      .eq("gamification_profile_id", gamificationProfileId)
      .eq("period_start", monthStart),
  ]);

  const weekly = ((weeklyRes.data as Row[]) ?? [])
    .map(mapUserQuestProgressWithQuestRow)
    .filter((row) => row.quest.cadence === "weekly");
  const seasonal = ((seasonalRes.data as Row[]) ?? [])
    .map(mapUserQuestProgressWithQuestRow)
    .filter((row) => row.quest.cadence === "seasonal");

  return { weekly, seasonal };
}

// --- Award RPC wrappers -----------------------------------------------
// Each of these is safe to call speculatively — the underlying function
// silently no-ops if the caller isn't currently eligible (wrong quest for
// this period, swap not actually completed, already claimed, etc.), so
// call sites don't need to pre-check eligibility themselves.

/** Call after an action that might complete a quest: listing created,
 * message sent, swap completed, wishlist item added, rating left. */
export async function bumpQuestProgress(supabase: SupabaseClient, questSlug: string): Promise<void> {
  const { error } = await supabase.rpc("bump_quest_progress", { p_quest_slug: questSlug });
  if (error) console.error(`Failed to bump quest progress (${questSlug}):`, error.message);
}

/** Call whenever the signed-in viewer looks at a completed swap — awards
 * the base swap-completion XP/points to whichever participant is viewing,
 * exactly once per participant per swap. */
export async function claimSwapCompletionReward(supabase: SupabaseClient, swapRequestId: string): Promise<void> {
  const { error } = await supabase.rpc("claim_swap_completion_reward", { p_swap_request_id: swapRequestId });
  if (error) console.error("Failed to claim swap completion reward:", error.message);
}

/** Call right after a profile save that sets onboarding_completed. */
export async function claimProfileCompletionReward(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("claim_profile_completion_reward");
  if (error) console.error("Failed to claim profile completion reward:", error.message);
}
