import type { SupabaseClient } from "@supabase/supabase-js";
import { mapListingRow, mapProfileRow, mapSwapRequestRow } from "@/lib/mappers";
import type { Listing, SwapRequest, SwapRequestWithDetails } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

interface CreateSwapRequestInput {
  listingId: string;
  senderId: string;
  receiverId: string;
  /** One or more of the sender's own listings, offered as a bundle. */
  offeredListingIds: string[];
  note?: string;
}

export async function createSwapRequest(
  supabase: SupabaseClient,
  input: CreateSwapRequestInput
): Promise<SwapRequest> {
  if (input.offeredListingIds.length === 0) {
    throw new Error("Choose at least one item to offer.");
  }

  const { data, error } = await supabase
    .from("swap_requests")
    .insert({
      listing_id: input.listingId,
      sender_id: input.senderId,
      receiver_id: input.receiverId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create swap request.");
  }

  const swapRequest = mapSwapRequestRow(data);
  await insertOfferedItems(supabase, swapRequest.id, input.offeredListingIds);

  if (input.note?.trim()) {
    await sendOpeningMessage(supabase, swapRequest.id, input.senderId, input.note);
  }

  return swapRequest;
}

interface CreateCounterOfferInput {
  parentRequestId: string;
  listingId: string;
  /** Whoever is countering becomes the new sender for this round. */
  senderId: string;
  receiverId: string;
  offeredListingIds: string[];
  note?: string;
}

/**
 * Proposes new terms in reply to a pending request. Creates a fresh
 * swap_requests row linked via parent_request_id, then marks the parent
 * 'countered' so it stops being actionable. The chat thread carries over
 * automatically (see the on_swap_request_created trigger in migration
 * 0009) — this isn't a new conversation, just a new round of the same one.
 *
 * Note: this isn't wrapped in a single DB transaction (the Supabase client
 * doesn't make that easy without a dedicated RPC function). If the items
 * insert fails after the request row succeeds, you're left with a
 * bundle-less counter row — a real but narrow edge case, consistent with
 * how a failed opening message already doesn't roll back request creation
 * elsewhere in this file.
 */
export async function createCounterOffer(
  supabase: SupabaseClient,
  input: CreateCounterOfferInput
): Promise<SwapRequest> {
  if (input.offeredListingIds.length === 0) {
    throw new Error("Choose at least one item to offer.");
  }

  const { data, error } = await supabase
    .from("swap_requests")
    .insert({
      listing_id: input.listingId,
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      parent_request_id: input.parentRequestId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to submit counter-offer.");
  }

  const counterRequest = mapSwapRequestRow(data);
  await insertOfferedItems(supabase, counterRequest.id, input.offeredListingIds);

  const { error: supersedeError } = await supabase
    .from("swap_requests")
    .update({ status: "countered" })
    .eq("id", input.parentRequestId);
  if (supersedeError) throw new Error(supersedeError.message);

  if (input.note?.trim()) {
    await sendOpeningMessage(supabase, counterRequest.id, input.senderId, input.note);
  }

  return counterRequest;
}

async function insertOfferedItems(
  supabase: SupabaseClient,
  swapRequestId: string,
  listingIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from("swap_request_items")
    .insert(listingIds.map((listingId) => ({ swap_request_id: swapRequestId, listing_id: listingId })));
  if (error) throw new Error(error.message);
}

async function sendOpeningMessage(
  supabase: SupabaseClient,
  swapRequestId: string,
  senderId: string,
  note: string
): Promise<void> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("swap_request_id", swapRequestId)
    .maybeSingle();

  if (!conversation) return;

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversation.id, sender_id: senderId, body: note.trim() });

  if (error) {
    // A failed opening message shouldn't roll back an otherwise successful
    // swap request — the person can always just send it as a follow-up.
    console.error("Failed to send opening message:", error.message);
  }
}

/** Returns any pending/accepted request the given user already has open on
 * a listing, so the UI can link to it instead of showing "Request swap"
 * again. */
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

/** Bulk version of findActiveSwapRequest — one query for every listing on
 * screen instead of one per card. Used by the Discover reel, which needs
 * this for a whole page of listings at once. Returns listingId -> the
 * sender's pending/accepted swap_requests id for that listing. */
export async function findActiveSwapRequestsForListings(
  supabase: SupabaseClient,
  listingIds: string[],
  senderId: string
): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();

  const { data } = await supabase
    .from("swap_requests")
    .select("id, listing_id")
    .in("listing_id", listingIds)
    .eq("sender_id", senderId)
    .in("status", ["pending", "accepted"]);

  const result = new Map<string, string>();
  for (const row of (data as Row[]) ?? []) {
    result.set(row.listing_id as string, row.id as string);
  }
  return result;
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

/** Batch-fetches the listings/profiles/conversation/offered-bundle for a
 * set of swap requests, avoiding a round trip per row. */
async function hydrateSwapRequests(
  supabase: SupabaseClient,
  swapRequests: SwapRequest[]
): Promise<SwapRequestWithDetails[]> {
  if (swapRequests.length === 0) return [];

  const swapRequestIds = swapRequests.map((sr) => sr.id);
  const profileIds = Array.from(new Set(swapRequests.flatMap((sr) => [sr.senderId, sr.receiverId])));

  const [itemsRes, profilesRes, conversationsRes, childrenRes] = await Promise.all([
    supabase.from("swap_request_items").select("swap_request_id, listing_id").in("swap_request_id", swapRequestIds),
    profileIds.length ? supabase.from("profiles").select("*").in("id", profileIds) : Promise.resolve({ data: [] }),
    supabase.from("conversations").select("id, swap_request_id").in("swap_request_id", swapRequestIds),
    supabase.from("swap_requests").select("id, parent_request_id").in("parent_request_id", swapRequestIds),
  ]);

  const itemRows = (itemsRes.data as Row[]) ?? [];
  const targetListingIds = swapRequests.map((sr) => sr.listingId);
  const offeredListingIds = itemRows.map((r) => r.listing_id as string);
  const allListingIds = Array.from(new Set([...targetListingIds, ...offeredListingIds]));

  const { data: listingRows } = allListingIds.length
    ? await supabase.from("listings").select("*").in("id", allListingIds)
    : { data: [] as Row[] };

  const listingsById = new Map(((listingRows as Row[]) ?? []).map((r) => [r.id as string, mapListingRow(r)]));
  const profilesById = new Map(((profilesRes.data as Row[]) ?? []).map((r) => [r.id as string, mapProfileRow(r)]));
  const conversationBySwapId = new Map(
    ((conversationsRes.data as Row[]) ?? []).map((r) => [r.swap_request_id as string, r.id as string])
  );
  const childBySwapId = new Map(
    ((childrenRes.data as Row[]) ?? []).map((r) => [r.parent_request_id as string, r.id as string])
  );

  const offeredListingIdsBySwapId = new Map<string, string[]>();
  for (const row of itemRows) {
    const key = row.swap_request_id as string;
    const list = offeredListingIdsBySwapId.get(key) ?? [];
    list.push(row.listing_id as string);
    offeredListingIdsBySwapId.set(key, list);
  }

  return swapRequests.map((sr) => ({
    ...sr,
    listing: listingsById.get(sr.listingId) ?? null,
    offeredListings: (offeredListingIdsBySwapId.get(sr.id) ?? [])
      .map((id) => listingsById.get(id))
      .filter((l): l is Listing => Boolean(l)),
    sender: profilesById.get(sr.senderId) ?? null,
    receiver: profilesById.get(sr.receiverId) ?? null,
    conversationId: conversationBySwapId.get(sr.id) ?? null,
    counteredByRequestId: childBySwapId.get(sr.id) ?? null,
  }));
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
 * have confirmed, the before_swap_request_update trigger flips the status
 * to 'completed' automatically. */
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
