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
