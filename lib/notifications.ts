import type { SupabaseClient } from "@supabase/supabase-js";
import { mapNotificationRow } from "@/lib/mappers";
import type { AppNotification } from "@/types";

export async function listNotifications(
  supabase: SupabaseClient,
  profileId: string,
  limit = 20
): Promise<AppNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapNotificationRow);
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  profileId: string
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("is_read", false);

  return count ?? 0;
}

export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  profileId: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", profileId)
    .eq("is_read", false);
}
