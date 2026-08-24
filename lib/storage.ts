import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Best-effort cleanup of uploaded files when a listing or its photos are
 * deleted. Failures are swallowed — an orphaned storage object is a minor
 * cost, but blocking a delete on storage cleanup failing is a worse
 * trade-off for the user.
 */
export async function deleteListingImages(
  supabase: SupabaseClient,
  urls: (string | null)[]
): Promise<void> {
  const paths = urls
    .filter((url): url is string => Boolean(url))
    .map(extractStoragePath)
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  try {
    await supabase.storage.from("listing-images").remove(paths);
  } catch {
    // Non-fatal — see doc comment above.
  }
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = "/listing-images/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
}
