import type { SupabaseClient } from "@supabase/supabase-js";
import { getBlockedEitherDirection } from "@/lib/blocks";
import { getAvailableListings, getOwnersByListingOwnerId } from "@/lib/listings";
import { mapDiscoverListingRow } from "@/lib/mappers";
import { findActiveSwapRequestsForListings } from "@/lib/swap-requests";
import { FEED_MAX_EXCLUDE_IDS, FEED_PAGE_SIZE } from "@/lib/feed/constants";
import { isPersistedListingId } from "@/lib/feed/ids";
import type { DiscoverFeedPage, DiscoverListing, Listing } from "@/types";

export interface DiscoverFeedOptions {
  /** Cards to return. Defaults to FEED_PAGE_SIZE. */
  limit?: number;
  /** Ids the client already has, to be skipped. Paging is "the next batch
   * that isn't in this set" rather than an offset, so cards passed
   * mid-session can't shift the window and cause skipped listings. */
  excludeIds?: string[];
}

interface RawFeed {
  listings: DiscoverListing[];
  hasMore: boolean;
}

/** A plain Listing (from the fallback path, which just queries `listings`
 * directly) carries none of get_discover_feed's ranking signals — filled
 * in as zero/false rather than left undefined, so every DiscoverListing in
 * the app always has real numbers to compare against MATCH_SCORE_THRESHOLD. */
function toUnscoredDiscoverListing(listing: Listing): DiscoverListing {
  return { ...listing, ownerWishlistedMine: false, wantScore: 0, acceptScore: 0 };
}

/**
 * One page of the Discover feed for a viewer (or a logged-out visitor when
 * `viewerId` is null), with the owners and pre-existing swap requests each
 * card needs. Used by the /discover page for the first page and by
 * POST /api/discover/feed for every page after.
 *
 * Filtering, text matching and ordering all live in the `get_discover_feed`
 * database function (prisma/migrations_manual/0014, extended by 0015): it
 * hides the viewer's own listings, blocked users, and anything they've
 * passed on; puts owners who saved one of the viewer's items first; and
 * otherwise orders by how well each candidate matches what the viewer's
 * own listings say they want, in both directions.
 */
export async function getDiscoverFeedPage(
  supabase: SupabaseClient,
  viewerId: string | null,
  options: DiscoverFeedOptions = {},
): Promise<DiscoverFeedPage> {
  const limit = options.limit ?? FEED_PAGE_SIZE;
  const excludeIds = (options.excludeIds ?? [])
    .filter(isPersistedListingId)
    .slice(-FEED_MAX_EXCLUDE_IDS);

  const { listings, hasMore } = await fetchFeedListings(
    supabase,
    viewerId,
    limit,
    excludeIds,
  );

  const persistedIds = listings.map((l) => l.id).filter(isPersistedListingId);
  const [owners, activeRequests] = await Promise.all([
    getOwnersByListingOwnerId(supabase, listings),
    viewerId && persistedIds.length > 0
      ? findActiveSwapRequestsForListings(supabase, persistedIds, viewerId)
      : Promise.resolve(new Map<string, string>()),
  ]);

  return {
    listings,
    owners,
    activeSwapRequestByListingId: Object.fromEntries(activeRequests),
    hasMore,
  };
}

async function fetchFeedListings(
  supabase: SupabaseClient,
  viewerId: string | null,
  limit: number,
  excludeIds: string[],
): Promise<RawFeed> {
  // Ask for one row beyond the page: if it comes back, there's more.
  const { data, error } = await supabase.rpc("get_discover_feed", {
    p_limit: limit + 1,
    p_exclude_ids: excludeIds,
  });

  if (error) {
    // Most likely migration 0014 and/or 0015 hasn't been applied yet. Keep
    // Discover working (unranked, no pass filtering, no match scores)
    // rather than showing nothing.
    console.error(
      "get_discover_feed failed; falling back to the unranked listing query.",
      error.message,
    );
    return unrankedFallback(supabase, viewerId, excludeIds);
  }

  const rows = (data as Record<string, unknown>[] | null) ?? [];

  // Placeholder listings are only for a completely empty database. A feed
  // that is empty because the viewer has passed on everything must stay
  // empty, not fill up with fake items.
  if (rows.length === 0 && excludeIds.length === 0) {
    if (!(await hasAnyAvailableListing(supabase))) {
      return unrankedFallback(supabase, viewerId, excludeIds);
    }
  }

  return {
    listings: rows.slice(0, limit).map(mapDiscoverListingRow),
    hasMore: rows.length > limit,
  };
}

async function hasAnyAvailableListing(supabase: SupabaseClient): Promise<boolean> {
  const { count, error } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "available");

  // If we can't tell, assume yes: better an empty feed than fake content.
  if (error) return true;
  return (count ?? 0) > 0;
}

/** The pre-0014 behaviour: everything available, newest first, minus the
 * viewer's own listings and blocked users. Returned as a single page,
 * with every listing's ranking signals zeroed out — see
 * toUnscoredDiscoverListing. */
async function unrankedFallback(
  supabase: SupabaseClient,
  viewerId: string | null,
  excludeIds: string[],
): Promise<RawFeed> {
  const blocked = viewerId
    ? await getBlockedEitherDirection(supabase, viewerId)
    : new Set<string>();
  const excludeOwnerIds = viewerId ? new Set([...blocked, viewerId]) : blocked;

  const all = await getAvailableListings(supabase, { excludeOwnerIds });
  const skip = new Set(excludeIds);
  return {
    listings: all.filter((l) => !skip.has(l.id)).map(toUnscoredDiscoverListing),
    hasMore: false,
  };
}
