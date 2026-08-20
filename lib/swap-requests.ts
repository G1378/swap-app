import type { SupabaseClient } from "@supabase/supabase-js";
import { mapListingRow, mapProfileRow, mapSwapRequestRow } from "@/lib/mappers";
import type { Listing, Profile, SwapRequest, SwapRequestWithDetails } from "@/types";

interface CreateSwapRequestInput {
  listingId: string;
  senderId: string;
  receiverId: string;
  offeredListingId: string;
  note?: string;
}

/**
 * Creates a swap request. The `0003_swap_mechanics.sql` triggers handle the
 * rest automatically: a conversation + participants are created, and the
 * listing owner gets a notification. If a note was provided, it's sent as
 * the opening chat message once the conversation exists.
 */
export async function createSwapRequest(
  supabase: SupabaseClient,
  input: CreateSwapRequestInput
): Promise<SwapRequest> {
  const { data, error } = await supabase
    .from("swap_requests")
    .insert({
      listing_id: input.listingId,
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      offered_listing_id: input.offeredListingId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create swap request.");
  }

  const swapRequest = mapSwapRequestRow(data);

  if (input.note?.trim()) {
    const conversation = await getConversationForSwapRequest(supabase, swapRequest.id);
    if (conversation) {
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: input.senderId,
        body: input.note.trim(),
      });
      // A failed opening message shouldn't roll back a successfully created
      // swap request - surface it, but don't throw.
      if (messageError) {
        console.error("Failed to send opening message:", messageError.message);
      }
    }
  }

  return swapRequest;
}

/** Returns the id of any pending/accepted request the given user already
 * has open on a listing, so the UI can link to it instead of showing a
 * "Request swap" button twice. */
export async function findActiveSwapRequest(
  supabase: SupabaseClient,
  listingId: string,
  senderId: string
): Promise<SwapRequest | null> {
  const { data } = await supabase
    .from("swap_requests")
    .select("*")
    .eq("listing_id", listingId)
    .eq("sender_id", senderId)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  return data ? mapSwapRequestRow(data) : null;
}

export async function listSwapRequestsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<SwapRequestWithDetails[]> {
  const { data, error } = await supabase
    .from("swap_requests")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return hydrateSwapRequests(supabase, data.map(mapSwapRequestRow));
}

export async function getSwapRequestById(
  supabase: SupabaseClient,
  id: string
): Promise<SwapRequestWithDetails | null> {
  const { data, error } = await supabase.from("swap_requests").select("*").eq("id", id).maybeSingle();

  if (error || !data) return null;

  const [hydrated] = await hydrateSwapRequests(supabase, [mapSwapRequestRow(data)]);
  return hydrated ?? null;
}

/** Batch-fetches the listings/profiles/conversation referenced by a set of
 * swap requests, avoiding one round trip per row. */
async function hydrateSwapRequests(
  supabase: SupabaseClient,
  swapRequests: SwapRequest[]
): Promise<SwapRequestWithDetails[]> {
  if (swapRequests.length === 0) return [];

  const listingIds = Array.from(
    new Set(
      swapRequests.flatMap((sr) => [sr.listingId, sr.offeredListingId].filter((id): id is string => !!id))
    )
  );
  const profileIds = Array.from(new Set(swapRequests.flatMap((sr) => [sr.senderId, sr.receiverId])));
  const swapRequestIds = swapRequests.map((sr) => sr.id);

  const [listingsRes, profilesRes, conversationsRes] = await Promise.all([
    listingIds.length
      ? supabase.from("listings").select("*").in("id", listingIds)
      : Promise.resolve({ data: [] as Listing[] }),
    profileIds.length
      ? supabase.from("profiles").select("*").in("id", profileIds)
      : Promise.resolve({ data: [] as Profile[] }),
    supabase.from("conversations").select("id, swap_request_id").in("swap_request_id", swapRequestIds),
  ]);

  const listingsById = new Map(((listingsRes.data as Row[]) ?? []).map((r) => [r.id, mapListingRow(r)]));
  const profilesById = new Map(((profilesRes.data as Row[]) ?? []).map((r) => [r.id, mapProfileRow(r)]));
  const conversationBySwapId = new Map(
    ((conversationsRes.data as Row[]) ?? []).map((r) => [r.swap_request_id as string, r.id as string])
  );

  return swapRequests.map((sr) => ({
    ...sr,
    listing: listingsById.get(sr.listingId) ?? null,
    offeredListing: sr.offeredListingId ? listingsById.get(sr.offeredListingId) ?? null : null,
    sender: profilesById.get(sr.senderId) ?? null,
    receiver: profilesById.get(sr.receiverId) ?? null,
    conversationId: conversationBySwapId.get(sr.id) ?? null,
  }));
}

export async function getConversationForSwapRequest(
  supabase: SupabaseClient,
  swapRequestId: string
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("swap_request_id", swapRequestId)
    .maybeSingle();

  return data ? { id: data.id } : null;
}

/** Receiver-only: accept or decline a pending request. */
export async function respondToSwapRequest(
  supabase: SupabaseClient,
  id: string,
  decision: "accepted" | "declined"
): Promise<void> {
  const { error } = await supabase.from("swap_requests").update({ status: decision }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Either participant: cancel a pending or accepted request. */
export async function cancelSwapRequest(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("swap_requests").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Marks the caller's side of an accepted swap as done. Once both sides
 * have confirmed, the `before_swap_request_update` trigger flips the
 * status to `completed` automatically. */
export async function markSwapSideComplete(
  supabase: SupabaseClient,
  id: string,
  role: "sender" | "receiver"
): Promise<void> {
  const column = role === "sender" ? "sender_completed_at" : "receiver_completed_at";
  const { error } = await supabase
    .from("swap_requests")
    .update({ [column]: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
