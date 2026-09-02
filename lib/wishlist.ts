import type { SupabaseClient } from "@supabase/supabase-js";
import { mapListingRow } from "@/lib/mappers";
import { bumpQuestProgress } from "@/lib/gamification/queries";
import type { WishlistEntry } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Full wishlist for a profile, each entry joined with its listing. Only
 * ever called for the signed-in user's own id — RLS restricts select to
 * `auth.uid() = profile_id` regardless. */
export async function getWishlist(
  supabase: SupabaseClient,
  profileId: string
): Promise<WishlistEntry[]> {
  const { data } = await supabase
    .from("wishlist_items")
    .select("id, profile_id, listing_id, created_at, listing:listings(*)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((row: Row) => ({
    id: row.id,
    profileId: row.profile_id,
    listingId: row.listing_id,
    createdAt: row.created_at,
    listing: row.listing ? mapListingRow(row.listing) : null,
  }));
}

/** Just the listing ids a profile has saved — used to pre-check heart icons
 * when browsing someone else's active listings. */
export async function getWishlistedListingIds(
  supabase: SupabaseClient,
  profileId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("wishlist_items")
    .select("listing_id")
    .eq("profile_id", profileId);

  return new Set((data ?? []).map((row: { listing_id: string }) => row.listing_id));
}

export async function addToWishlist(
  supabase: SupabaseClient,
  profileId: string,
  listingId: string
): Promise<void> {
  const { error } = await supabase
    .from("wishlist_items")
    .insert({ profile_id: profileId, listing_id: listingId });

  // 23505 = unique_violation — already wishlisted, treat as a no-op success.
  if (error && error.code !== "23505") throw new Error(error.message);

  if (!error) {
    await bumpQuestProgress(supabase, "update-your-wishlist");
  }
}

export async function removeFromWishlist(
  supabase: SupabaseClient,
  profileId: string,
  listingId: string
): Promise<void> {
  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("profile_id", profileId)
    .eq("listing_id", listingId);

  if (error) throw new Error(error.message);
}
