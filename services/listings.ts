import type { CreateListingResult, ListingDraft } from "@/types/listing";

/**
 * Creates a listing.
 *
 * STUB: nothing is stored yet. When Supabase is wired in, upload the photos
 * to storage, insert the listing row, and return `persisted: true`. The
 * publish form only depends on this signature, so nothing else needs to change.
 */
export async function createListing(draft: ListingDraft): Promise<CreateListingResult> {
  void draft;
  await new Promise((resolve) => setTimeout(resolve, 600));
  return { id: crypto.randomUUID(), persisted: false };
}
