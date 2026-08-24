import type { SupabaseClient } from "@supabase/supabase-js";
import { mapListingRow, mapProfileRow } from "@/lib/mappers";
import type { Listing, Profile } from "@/types";

export async function getProfileById(
  supabase: SupabaseClient,
  id: string
): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data ? mapProfileRow(data) : null;
}

export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  return data ? mapProfileRow(data) : null;
}

export interface ProfileListings {
  /** Everything not yet swapped away (available + pending). */
  active: Listing[];
  /** Completed trades — shown as a read-only "closet history". */
  swapped: Listing[];
}

export async function getProfileListings(
  supabase: SupabaseClient,
  profileId: string
): Promise<ProfileListings> {
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_id", profileId)
    .order("created_at", { ascending: false });

  const all = (data ?? []).map(mapListingRow);

  return {
    active: all.filter((l) => l.status !== "swapped"),
    swapped: all.filter((l) => l.status === "swapped"),
  };
}

/** Cheap count of completed swaps for a profile, without hydrating full swap details. */
export async function getCompletedSwapCount(
  supabase: SupabaseClient,
  profileId: string
): Promise<number> {
  const { count } = await supabase
    .from("swap_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`);

  return count ?? 0;
}

/** All profiles for the Members directory, most recently joined first. */
export async function listProfiles(supabase: SupabaseClient, limit = 200): Promise<Profile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapProfileRow);
}
