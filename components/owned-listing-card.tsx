"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPhotosForListing } from "@/lib/listing-photos";
import { deleteListingImages } from "@/lib/storage";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/types";

/**
 * Same visual as ListingCard, but wraps it with a link to the edit page
 * (owner-only view - used on the current user's own profile). Available
 * listings also get a quick delete action here so you don't have to open
 * Edit first; listings mid-swap or already swapped only offer Edit (the
 * delete guard trigger would reject those anyway — see migration 0007).
 */
export function OwnedListingCard({ listing }: { listing: Listing }) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Delete this listing? This can't be undone.")) return;

    setDeleting(true);
    try {
      const photos = await getPhotosForListing(supabase, listing.id);
      const { error } = await supabase.from("listings").delete().eq("id", listing.id);
      if (error) throw new Error(error.message);

      await deleteListingImages(supabase, [listing.imageUrl, ...photos.map((p) => p.url)]);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete listing.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group relative">
      <ListingCard listing={listing} />
      <Link
        href={`/listings/${listing.id}/edit`}
        className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur transition-opacity hover:bg-background"
      >
        <Pencil className="h-3 w-3" /> Edit
      </Link>
      {listing.status === "available" && (
        // Positioned below ListingCard's own "Available" status badge
        // (which sits at right-2 top-2) to avoid overlapping it.
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete listing"
          className="absolute right-2 top-11 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
