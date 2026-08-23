import { ListingCard } from "@/components/listing-card";
import { ListingOwnerBadge } from "@/components/listing-owner-badge";
import type { Listing, Profile } from "@/types";

interface ListingCardWithOwnerProps {
  listing: Listing;
  owner: Pick<Profile, "username" | "fullName"> | null;
}

export function ListingCardWithOwner({ listing, owner }: ListingCardWithOwnerProps) {
  return (
    <div className="group relative">
      <ListingCard listing={listing} />
      {owner && <ListingOwnerBadge username={owner.username} name={owner.fullName || owner.username} />}
    </div>
  );
}
