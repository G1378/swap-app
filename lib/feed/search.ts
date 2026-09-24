import type { SupabaseClient } from "@supabase/supabase-js";
import { mapListingRow } from "@/lib/mappers";
import type { Listing } from "@/types";

interface SearchListingsOptions {
  query: string;
  /** The searching user, so their own listings are left out. */
  viewerId: string | null;
  /** Owners to hide — blocked in either direction. */
  excludeOwnerIds?: Set<string>;
  limit?: number;
}

/** Escapes LIKE wildcards so a search for "100%" or "a_b" matches those
 * characters literally instead of acting as a pattern. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Title search across every available listing, run directly from the
 * browser against Supabase (RLS on `listings` is `select using (true)`, so
 * this needs no server route). The Discover feed is paged — see
 * lib/feed/queries.ts — so only part of the catalogue is ever loaded
 * client-side; searching that subset would miss most listings, which is
 * why this queries the database instead of filtering an in-memory array.
 *
 * Results deliberately include listings the viewer has passed on:
 * searching for something by name is an explicit request to see it again.
 */
export async function searchAvailableListings(
  supabase: SupabaseClient,
  { query, viewerId, excludeOwnerIds, limit = 30 }: SearchListingsOptions,
): Promise<Listing[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  let request = supabase
    .from("listings")
    .select("*")
    .eq("status", "available")
    .ilike("title", `%${escapeLikePattern(trimmed)}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (viewerId) request = request.neq("owner_id", viewerId);

  const { data, error } = await request;
  if (error || !data) return [];

  return data
    .map(mapListingRow)
    .filter((listing) => !excludeOwnerIds?.has(listing.ownerId));
}
