import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRatingRow } from "@/lib/mappers";
import type { Rating, RatingSummary } from "@/types";

interface CreateRatingInput {
  authorId: string;
  subjectId: string;
  swapRequestId: string;
  score: number;
  comment?: string;
}

export async function createRating(supabase: SupabaseClient, input: CreateRatingInput): Promise<Rating> {
  const { data, error } = await supabase
    .from("ratings")
    .insert({
      author_id: input.authorId,
      subject_id: input.subjectId,
      swap_request_id: input.swapRequestId,
      score: input.score,
      comment: input.comment?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to submit rating.");
  }

  return mapRatingRow(data);
}

/** Ratings a given user has already left for a specific swap (0, 1, or in
 * rare double-submit races, up to 1 thanks to the unique index). */
export async function getMyRatingForSwap(
  supabase: SupabaseClient,
  swapRequestId: string,
  authorId: string
): Promise<Rating | null> {
  const { data } = await supabase
    .from("ratings")
    .select("*")
    .eq("swap_request_id", swapRequestId)
    .eq("author_id", authorId)
    .maybeSingle();

  return data ? mapRatingRow(data) : null;
}

export async function getProfileRatingSummary(
  supabase: SupabaseClient,
  profileId: string
): Promise<RatingSummary> {
  const { data } = await supabase.from("ratings").select("score").eq("subject_id", profileId);

  if (!data || data.length === 0) {
    return { average: null, count: 0 };
  }

  const total = data.reduce((sum: number, row: { score: number }) => sum + row.score, 0);
  return { average: total / data.length, count: data.length };
}
