import type { SupabaseClient } from "@supabase/supabase-js";
import { mapProfileRow, mapRatingRow } from "@/lib/mappers";
import type { Rating, RatingBreakdown, RatingSummary, RatingWithAuthor } from "@/types";

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

// --- Appended for profile redesign ---------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/**
 * Star-count histogram (5→1) for a profile's reviews. Kept as a single
 * lightweight `score`-only query since the full rows aren't needed here.
 */
export async function getRatingBreakdown(
  supabase: SupabaseClient,
  profileId: string
): Promise<RatingBreakdown> {
  const { data } = await supabase.from("ratings").select("score").eq("subject_id", profileId);

  const counts: RatingBreakdown["counts"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of data ?? []) {
    const score = row.score as 1 | 2 | 3 | 4 | 5;
    if (counts[score] !== undefined) counts[score] += 1;
  }

  return { counts, total: data?.length ?? 0 };
}

/**
 * Full review list for a profile, each joined with its author.
 *
 * `ratings` has two FKs into `profiles` (author_id, subject_id), which makes
 * PostgREST's implicit embed syntax ambiguous. Rather than depend on a
 * specific (and potentially renamed) constraint name, this does two plain
 * queries and joins in memory — a little less clever, a lot less fragile.
 */
export async function listRatingsForProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<RatingWithAuthor[]> {
  const { data } = await supabase
    .from("ratings")
    .select("*")
    .eq("subject_id", profileId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const authorIds = Array.from(new Set(data.map((row: Row) => row.author_id as string)));
  const { data: authorRows } = await supabase.from("profiles").select("*").in("id", authorIds);

  const authorsById = new Map(
    (authorRows ?? []).map((row: Row) => [row.id as string, mapProfileRow(row)])
  );

  return data.map((row: Row) => ({
    ...mapRatingRow(row),
    author: authorsById.get(row.author_id) ?? null,
  }));
}
