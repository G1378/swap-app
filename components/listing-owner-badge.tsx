import Link from "next/link";
import { User } from "lucide-react";

interface ListingOwnerBadgeProps {
  username: string;
  name: string;
}

/** Small clickable owner pill overlaid on a listing card's photo. Rendered
 * as a sibling of ListingCard's own Link (see ListingCardWithOwner), never
 * nested inside it — browsers don't allow nested <a> tags. */
export function ListingOwnerBadge({ username, name }: ListingOwnerBadgeProps) {
  return (
    <Link
      href={`/profile/${username}`}
      className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-background"
    >
      <User className="h-3 w-3" /> {name}
    </Link>
  );
}
