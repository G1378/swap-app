import type { SupabaseClient } from "@supabase/supabase-js";
import { mapListingPhotoRow } from "@/lib/mappers";
import type { ListingPhoto } from "@/types";

/** Additional gallery photos allowed on top of the single cover photo. */
export const MAX_GALLERY_PHOTOS = 4;

export async function getPhotosForListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<ListingPhoto[]> {
  const { data } = await supabase
    .from("listing_photos")
    .select("*")
    .eq("listing_id", listingId)
    .order("position", { ascending: true });

  return (data ?? []).map(mapListingPhotoRow);
}

export async function addListingPhoto(
  supabase: SupabaseClient,
  listingId: string,
  url: string,
  position: number
): Promise<ListingPhoto> {
  const { data, error } = await supabase
    .from("listing_photos")
    .insert({ listing_id: listingId, url, position })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to add photo.");
  }

  return mapListingPhotoRow(data);
}

export async function deleteListingPhoto(supabase: SupabaseClient, photoId: string): Promise<void> {
  const { error } = await supabase.from("listing_photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);
}
