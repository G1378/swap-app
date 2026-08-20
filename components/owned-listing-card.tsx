import Link from "next/link";
import { Pencil } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/types";

/**
 * Same visual as ListingCard, but wraps it with a link to the edit page
 * (owner-only view - used on the current user's own profile).
 */
export function OwnedListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="group relative">
      <ListingCard listing={listing} />
      <Link
        href={`/listings/${listing.id}/edit`}
        className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur transition-opacity hover:bg-background"
      >
        <Pencil className="h-3 w-3" /> Edit
      </Link>
    </div>
  );
}
