import { createClient } from "@/lib/supabase/server";
import {
  getAvailableListings,
  getOwnersByListingOwnerId,
} from "@/lib/listings";
import { getBlockedEitherDirection } from "@/lib/blocks";
import { LISTING_CATEGORIES } from "@/lib/constants";
import { DiscoverGrid } from "@/components/discover-grid";

/**
 * All-categories browse + search — the grid/filter experience DiscoverGrid
 * already supported (`activeCategory: null` was always "All categories"
 * in its own props comment) but that, until now, only had a page wired up
 * per-category at /discover/[category]. This is the MobileNav "Search"
 * tab's destination: fast scanning across everything, complementing the
 * one-at-a-time swipe reel at /discover.
 */
export default async function SearchPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const blockedIds = user
    ? await getBlockedEitherDirection(supabase, user.id)
    : new Set<string>();
  const listings = await getAvailableListings(supabase, {
    excludeOwnerIds: blockedIds,
  });
  const owners = await getOwnersByListingOwnerId(supabase, listings);

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-muted-foreground">
          Browse everything available to swap right now.
        </p>
      </div>
      <DiscoverGrid
        listings={listings}
        owners={owners}
        categories={[...LISTING_CATEGORIES]}
        activeCategory={null}
      />
    </div>
  );
}
