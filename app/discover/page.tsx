import { createClient } from "@/lib/supabase/server";
import { getMyAvailableListings } from "@/lib/listings";
import { getDiscoverFeedPage } from "@/lib/feed/queries";
import { getWishlistedListingIds } from "@/lib/wishlist";
import { getGamificationProfile } from "@/lib/gamification/queries";
import { DiscoverReel } from "@/components/discover-reel";
import type { GamificationProfile, Listing } from "@/types";

/**
 * Discover is a full-screen, swipeable reel rather than a filterable grid —
 * see components/discover-reel.tsx for the interaction. Browsing by
 * category still works at /discover/[category], which keeps the original
 * grid + filters (see app/discover/[category]/page.tsx).
 *
 * Only the first page of the feed is loaded here; the reel fetches
 * further pages itself from POST /api/discover/feed as the viewer nears
 * the end of what's loaded (see hooks/use-discover-feed.ts). Ranking,
 * blocking, self-exclusion and "not interested" filtering all happen in
 * the `get_discover_feed` database function — see
 * lib/feed/queries.ts and prisma/migrations_manual/0014.
 */
export default async function DiscoverPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const page = await getDiscoverFeedPage(supabase, user?.id ?? null);

  let myListings: Listing[] = [];
  let wishlistedListingIds: string[] = [];
  let gamification: GamificationProfile | null = null;

  if (user) {
    const [mine, wishlisted, gamificationProfile] = await Promise.all([
      getMyAvailableListings(supabase, user.id),
      getWishlistedListingIds(supabase, user.id),
      getGamificationProfile(supabase, user.id),
    ]);

    myListings = mine;
    wishlistedListingIds = Array.from(wishlisted);
    gamification = gamificationProfile;
  }

  return (
    <DiscoverReel
      listings={page.listings}
      owners={page.owners}
      currentUserId={user?.id ?? null}
      myListings={myListings}
      initialWishlistedListingIds={wishlistedListingIds}
      activeSwapRequestByListingId={page.activeSwapRequestByListingId}
      initialHasMore={page.hasMore}
      gamification={gamification}
    />
  );
}
