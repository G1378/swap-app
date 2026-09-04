import { createClient } from "@/lib/supabase/server";
import {
  getAvailableListings,
  getMyAvailableListings,
  getOwnersByListingOwnerId,
} from "@/lib/listings";
import { getBlockedEitherDirection } from "@/lib/blocks";
import { findActiveSwapRequestsForListings } from "@/lib/swap-requests";
import { getWishlistedListingIds } from "@/lib/wishlist";
import { getGamificationProfile } from "@/lib/gamification/queries";
import { DiscoverReel } from "@/components/discover-reel";
import type { GamificationProfile, Listing } from "@/types";

/**
 * Discover is now a full-screen, swipeable reel rather than a filterable
 * grid — see components/discover-reel.tsx for the interaction. Browsing by
 * category still works at /discover/[category], which keeps the original
 * grid + filters (see app/discover/[category]/page.tsx).
 */
export default async function DiscoverPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const blockedIds = user
    ? await getBlockedEitherDirection(supabase, user.id)
    : new Set<string>();
  // Also hide the viewer's own listings from their own feed — there's
  // nothing to swap with yourself, so a self-owned card would just be a
  // dead end mid-swipe.
  const excludeOwnerIds = user ? new Set([...blockedIds, user.id]) : blockedIds;

  const listings = await getAvailableListings(supabase, { excludeOwnerIds });
  const owners = await getOwnersByListingOwnerId(supabase, listings);

  let myListings: Listing[] = [];
  let wishlistedListingIds: string[] = [];
  let activeSwapRequestByListingId: Record<string, string> = {};
  let gamification: GamificationProfile | null = null;

  if (user) {
    const [mine, wishlisted, activeRequests, gamificationProfile] =
      await Promise.all([
        getMyAvailableListings(supabase, user.id),
        getWishlistedListingIds(supabase, user.id),
        findActiveSwapRequestsForListings(
          supabase,
          listings.map((l) => l.id),
          user.id,
        ),
        getGamificationProfile(supabase, user.id),
      ]);

    myListings = mine;
    wishlistedListingIds = Array.from(wishlisted);
    activeSwapRequestByListingId = Object.fromEntries(activeRequests);
    gamification = gamificationProfile;
  }

  return (
    <DiscoverReel
      listings={listings}
      owners={owners}
      currentUserId={user?.id ?? null}
      myListings={myListings}
      initialWishlistedListingIds={wishlistedListingIds}
      activeSwapRequestByListingId={activeSwapRequestByListingId}
      gamification={gamification}
    />
  );
}
