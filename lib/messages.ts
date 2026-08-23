import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { mapMessageRow } from "@/lib/mappers";
import type { Message } from "@/types";

export async function listMessages(supabase: SupabaseClient, conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(mapMessageRow);
}

export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string
): Promise<Message> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Message can't be empty.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to send message.");
  }

  return mapMessageRow(data);
}

/**
 * Subscribes to new messages in a conversation via Supabase Realtime.
 * Returns the channel so the caller can unsubscribe on unmount.
 * Requires `messages` to be added to the `supabase_realtime` publication
 * (see migration 0003_swap_mechanics.sql).
 */
export function subscribeToMessages(
  supabase: SupabaseClient,
  conversationId: string,
  onInsert: (message: Message) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(mapMessageRow(payload.new))
    )
    .subscribe();
}

// --- Appended for inbox upgrades ------------------------------------------

/** Stamps "read up to now" for one participant in a conversation. Called
 * when a chat thread is opened and whenever a new message arrives while
 * it's still open. */
export async function markConversationRead(
  supabase: SupabaseClient,
  conversationId: string,
  profileId: string
): Promise<void> {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId);
}

/**
 * Unread message count per conversation for a given profile, keyed by
 * conversation id. A message counts as unread if it was sent by someone
 * else and is newer than this profile's `last_read_at` for that
 * conversation (or the conversation has never been read at all).
 */
export async function getUnreadMessageCounts(
  supabase: SupabaseClient,
  profileId: string
): Promise<Map<string, number>> {
  const { data: participantRows } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("profile_id", profileId);

  if (!participantRows || participantRows.length === 0) return new Map();

  const conversationIds = participantRows.map((row: { conversation_id: string }) => row.conversation_id);
  const lastReadByConversation = new Map(
    participantRows.map((row: { conversation_id: string; last_read_at: string | null }) => [
      row.conversation_id,
      row.last_read_at,
    ])
  );

  const { data: messageRows } = await supabase
    .from("messages")
    .select("conversation_id, created_at, sender_id")
    .in("conversation_id", conversationIds)
    .neq("sender_id", profileId);

  const counts = new Map<string, number>();
  for (const row of messageRows ?? []) {
    const lastRead = lastReadByConversation.get(row.conversation_id);
    const isUnread = !lastRead || new Date(row.created_at) > new Date(lastRead);
    if (isUnread) counts.set(row.conversation_id, (counts.get(row.conversation_id) ?? 0) + 1);
  }

  return counts;
}
