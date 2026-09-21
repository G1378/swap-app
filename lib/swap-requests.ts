import type { SupabaseClient } from "@supabase/supabase-js";
import { mapListingRow, mapProfileRow, mapSwapRequestRow } from "@/lib/mappers";
import type { Listing, SwapRequest, SwapRequestWithDetails } from "@/types";

type Row = Record<string, any>;

interface CreateSwapRequestInput {
  receiverId: string;
  /** One or more of the receiver's listings being asked for. */
  requestedListingIds: string[];
  /** One or more of the sender's own listings, offered as a bundle. */
  offeredListingIds: string[];
  /** Points the sender is adding on top of their offered bundle. */
  offeredPoints?: number;
  note?: string;
}

/**
 * Opens a new swap request. Goes through the create_swap_request() RPC
 * (see migration 0012) rather than a plain insert, so the two bundles, the
 * points balance check, the "no duplicate active request for this item"
 * guard, and the notification all happen atomically server-side instead of
 * as several sequential client calls.
 */
export async function createSwapRequest(
  supabase: SupabaseClient,
  input: CreateSwapRequestInput
): Promise<string> {
  if (input.requestedListingIds.length === 0) {
    throw new Error("Choose at least one item to request.");
  }
  if (input.offeredListingIds.length === 0) {
    throw new Error("Choose at least one item to offer.");
  }

  const { data, error } = await supabase.rpc("create_swap_request", {
    p_receiver_id: input.receiverId,
    p_requested_listing_ids: input.requestedListingIds,
    p_offered_listing_ids: input.offeredListingIds,
    p_offered_points: input.offeredPoints ?? 0,
    p_note: input.note?.trim() ? input.note.trim() : null,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create swap request.");
  }

  return data as string;
}

interface SubmitCounterOfferInput {
  parentRequestId: string;
  /** One or more of the OTHER party's listings being asked for — this is
   * what makes a counter able to request multiple items back, not just
   * the one originally on the table. */
  requestedListingIds: string[];
  /** One or more of the caller's own listings, offered as a bundle. */
  offeredListingIds: string[];
  offeredPoints?: number;
  requestedPoints?: number;
  note?: string;
}

/**
 * Proposes new terms in reply to a pending request. Either participant can
 * call this (not just the receiver) — whoever calls it becomes the new
 * round's sender. Goes through the submit_counter_offer() RPC (migration
 * 0012), which atomically: validates both bundles belong to the right
 * people and are available, checks any offered/requested points can
 * actually be covered, inserts the new row + both bundles, marks the
 * parent 'countered', and writes the notification — all in one
 * transaction, fixing the earlier non-atomic two-call version of this.
 */
export async function createCounterOffer(
  supabase: SupabaseClient,
  input: SubmitCounterOfferInput
): Promise<string> {
  if (input.requestedListingIds.length === 0) {
    throw new Error("Choose at least one item to request.");
  }
  if (input.offeredListingIds.length === 0) {
    throw new Error("Choose at least one item to offer.");
  }

  const { data, error } = await supabase.rpc("submit_counter_offer", {
    p_parent_request_id: input.parentRequestId,
    p_requested_listing_ids: input.requestedListingIds,
    p_offered_listing_ids: input.offeredListingIds,
    p_offered_points: input.offeredPoints ?? 0,
    p_requested_points: input.requestedPoints ?? 0,
    p_note: input.note?.trim() ? input.note.trim() : null,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to submit counter-offer.");
  }

  return data as string;
}

/** Returns any pending/accepted request the given user already has open on
 * a listing, so the UI can link to it instead of showing "Request swap"
 * again. Looks through the 'requested' side of the bundle table, since
 * there's no longer a single listing_id column on swap_requests. */
export async function findActiveSwapRequest(
  supabase: SupabaseClient,
  listingId: string,
  senderId: string
): Promise<SwapRequest | null> {
  const { data: itemRows } = await supabase
    .from("swap_request_items")
    .select("swap_request_id")
    .eq("listing_id", listingId)
    .eq("side", "requested");

  const swapRequestIds = ((itemRows as Row[]) ?? []).map((r) => r.swap_request_id as string);
  if (swapRequestIds.length === 0) return null;

  const { data } = await supabase
    .from("swap_requests")
    .select("*")
    .in("id", swapRequestIds)
    .eq("sender_id", senderId)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1);

  return data && data[0] ? mapSwapRequestRow(data[0]) : null;
}

/** Bulk version of findActiveSwapRequest — one pair of queries for a whole
 * page of listings instead of one per card. Used by the Discover reel.
 * Returns listingId -> the sender's pending/accepted swap_requests id for
 * that listing. */
export async function findActiveSwapRequestsForListings(
  supabase: SupabaseClient,
  listingIds: string[],
  senderId: string
): Promise<Map<string, string>> {
  if (listingIds.length === 0) return new Map();

  const { data: itemRows } = await supabase
    .from("swap_request_items")
    .select("swap_request_id, listing_id")
    .in("listing_id", listingIds)
    .eq("side", "requested");

  const rows = (itemRows as Row[]) ?? [];
  if (rows.length === 0) return new Map();

  const swapRequestIds = Array.from(new Set(rows.map((r) => r.swap_request_id as string)));

  const { data: swapRows } = await supabase
    .from("swap_requests")
    .select("id")
    .in("id", swapRequestIds)
    .eq("sender_id", senderId)
    .in("status", ["pending", "accepted"]);

  const activeSwapIds = new Set(((swapRows as Row[]) ?? []).map((r) => r.id as string));

  const result = new Map<string, string>();
  for (const row of rows) {
    const swapId = row.swap_request_id as string;
    const listingId = row.listing_id as string;
    // A listing shouldn't end up in more than one active request's
    // bundle for the same sender, but if it ever did, keep the first
    // match rather than letting a later one silently overwrite it.
    if (activeSwapIds.has(swapId) && !result.has(listingId)) {
      result.set(listingId, swapId);
    }
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

/** Batch-fetches the listings/profiles/conversation/both bundles for a set
 * of swap requests, avoiding a round trip per row. */
async function hydrateSwapRequests(
  supabase: SupabaseClient,
  swapRequests: SwapRequest[]
): Promise<SwapRequestWithDetails[]> {
  if (swapRequests.length === 0) return [];

  const swapRequestIds = swapRequests.map((sr) => sr.id);
  const profileIds = Array.from(new Set(swapRequests.flatMap((sr) => [sr.senderId, sr.receiverId])));

  const [itemsRes, profilesRes, conversationsRes, childrenRes] = await Promise.all([
    supabase
      .from("swap_request_items")
      .select("swap_request_id, listing_id, side")
      .in("swap_request_id", swapRequestIds),
    profileIds.length ? supabase.from("profiles").select("*").in("id", profileIds) : Promise.resolve({ data: [] }),
    supabase.from("conversations").select("id, swap_request_id").in("swap_request_id", swapRequestIds),
    supabase.from("swap_requests").select("id, parent_request_id").in("parent_request_id", swapRequestIds),
  ]);

  const itemRows = (itemsRes.data as Row[]) ?? [];
  const allListingIds = Array.from(new Set(itemRows.map((r) => r.listing_id as string)));

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

  const offeredIdsBySwapId = new Map<string, string[]>();
  const requestedIdsBySwapId = new Map<string, string[]>();
  for (const row of itemRows) {
    const key = row.swap_request_id as string;
    const bucket = row.side === "requested" ? requestedIdsBySwapId : offeredIdsBySwapId;
    const list = bucket.get(key) ?? [];
    list.push(row.listing_id as string);
    bucket.set(key, list);
  }

  const toListings = (ids: string[] | undefined): Listing[] =>
    (ids ?? []).map((id) => listingsById.get(id)).filter((l): l is Listing => Boolean(l));

  return swapRequests.map((sr) => ({
    ...sr,
    offeredListings: toListings(offeredIdsBySwapId.get(sr.id)),
    requestedListings: toListings(requestedIdsBySwapId.get(sr.id)),
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
 * to 'completed' automatically and settles any points that were part of
 * the deal (see migration 0012 — this previously never actually fired due
 * to a bug in the trigger, now fixed). */
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
