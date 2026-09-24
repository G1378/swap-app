import type { SupabaseClient } from "@supabase/supabase-js";
import type { PassReason } from "@/types";

/**
 * "Not interested" persistence. All three run from the browser with the
 * signed-in user's session; row-level security restricts every operation to
 * the caller's own rows (prisma/migrations_manual/0014).
 */

/** Records a pass. Idempotent: passing the same listing twice is a no-op,
 * and never overwrites a reason that was already chosen. */
export async function recordPass(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<void> {
  const { error } = await supabase
    .from("listing_passes")
    .upsert(
      { user_id: userId, listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    );

  if (error) throw new Error(error.message);
}

/** Attaches the optional reason chosen after the swipe. */
export async function setPassReason(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  reason: PassReason,
): Promise<void> {
  const { error } = await supabase
    .from("listing_passes")
    .update({ reason })
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) throw new Error(error.message);
}

/** Removes a pass, so the listing is eligible for the feed again. */
export async function undoPass(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<void> {
  const { error } = await supabase
    .from("listing_passes")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) throw new Error(error.message);
}
