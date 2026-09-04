import { ListingCard } from "@/components/listing-card";
import { WishlistButton } from "@/components/wishlist-button";
import type { Listing } from "@/types";

interface WishlistableListingCardProps {
  listing: Listing;
  userId: string | null;
  initialSaved: boolean;
}

/**
 * Same visual as ListingCard, with a heart toggle overlaid top-left so
 * visitors can save someone else's listing to their own wishlist.
 * (Owner's own listings never render this — see profile-tabs-section.)
 */
export function WishlistableListingCard({ listing, userId, initialSaved }: WishlistableListingCardProps) {
  return (
    <div className="group relative">
      <ListingCard listing={listing} />
      <WishlistButton listingId={listing.id} userId={userId} initialSaved={initialSaved} className="absolute left-2 top-2" />
    </div>
  );
}
