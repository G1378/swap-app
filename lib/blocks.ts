import type { SupabaseClient } from "@supabase/supabase-js";

export async function isBlocked(
  supabase: SupabaseClient,
  viewerId: string,
  otherId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", viewerId)
    .eq("blocked_id", otherId)
    .maybeSingle();

  return Boolean(data);
}

export async function blockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<void> {
  const { error } = await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  // 23505 = unique_violation — already blocked, treat as a no-op success.
  if (error && error.code !== "23505") throw new Error(error.message);
}

export async function unblockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) throw new Error(error.message);
}

/**
 * Ids of everyone with a block relationship in either direction with this
 * profile — used to hide their listings/profile from browse views.
 * Deliberately doesn't distinguish "I blocked them" from "they blocked me":
 * either way, mutual invisibility is the intended behavior.
 */
export async function getBlockedEitherDirection(
  supabase: SupabaseClient,
  profileId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${profileId},blocked_id.eq.${profileId}`);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.blocker_id !== profileId) ids.add(row.blocker_id);
    if (row.blocked_id !== profileId) ids.add(row.blocked_id);
  }
  return ids;
}
