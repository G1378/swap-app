import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReportReason } from "@/types";

interface CreateReportInput {
  reporterId: string;
  reportedId: string;
  listingId?: string | null;
  reason: ReportReason;
  details?: string;
}

/**
 * Stores a user report. There's no admin dashboard in this app yet, so
 * these accumulate in the `reports` table for later manual review rather
 * than routing anywhere automatically.
 */
export async function createReport(supabase: SupabaseClient, input: CreateReportInput): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    reported_id: input.reportedId,
    listing_id: input.listingId ?? null,
    reason: input.reason,
    details: input.details?.trim() || null,
  });

  if (error) throw new Error(error.message);
}
