/**
 * Lightweight, dependency-free text similarity for small in-memory
 * comparisons — specifically, picking which of the viewer's own listings
 * best matches what a listing's owner said they want, to pre-select it in
 * the swap offer builder (see components/swap-request-dialog.tsx).
 *
 * This is deliberately separate from the Discover feed's ranking, which
 * runs at database scale using Postgres's pg_trgm extension (see
 * prisma/migrations_manual/0015 and lib/feed/queries.ts) — that's what
 * actually decided the feed's order, so re-deriving it client-side would
 * both duplicate logic and risk disagreeing with it. This solves a much
 * smaller, different problem: comparing one string against a handful of
 * the viewer's own listing titles, already loaded in the browser, where a
 * server round trip would be overkill.
 *
 * Implements the Sørensen–Dice coefficient over character trigrams — the
 * same family of algorithm pg_trgm itself uses — so a "match" here means
 * roughly the same thing it means on the server, even though the two
 * implementations don't share code. Verified against realistic listing
 * text (see the module's test-adjacent comments below) to give sensible,
 * non-crazy scores before it shipped.
 */

const MIN_LENGTH_FOR_TRIGRAMS = 3;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Character trigrams of `text`, padded with two leading and one trailing
 * space (mirrors pg_trgm's own boundary padding) so short prefixes/suffixes
 * still contribute a gram. */
function trigramsOf(text: string): Set<string> {
  const padded = `  ${text} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

/**
 * Dice coefficient of two strings' character-trigram sets: 0 (no overlap)
 * to 1 (identical after normalizing case/whitespace). Strings too short to
 * form a trigram fall back to an exact-match check.
 *
 * Sanity-checked against realistic listing text before shipping: "Xbox
 * Series X" vs "Xbox Series X Console" ≈ 0.78; "Nintendo Switch" vs
 * "Nintendo Switch OLED" ≈ 0.87; "Xbox Series X" vs "Acoustic Guitar" = 0.
 */
export function textSimilarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.length < MIN_LENGTH_FOR_TRIGRAMS || normB.length < MIN_LENGTH_FOR_TRIGRAMS) {
    return normA === normB ? 1 : 0;
  }

  const gramsA = trigramsOf(normA);
  const gramsB = trigramsOf(normB);
  let shared = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) shared++;
  }
  return (2 * shared) / (gramsA.size + gramsB.size);
}

/**
 * Picks the id of whichever `candidates` entry best matches `wantedText`
 * (compared against each candidate's "category + title", mirroring how
 * get_discover_feed composes the same comparison server-side), or null if
 * nothing clears `threshold`. Used to default the swap offer builder to
 * the most relevant item instead of whichever listing happens to be
 * first in the array.
 */
export function bestMatchingListingId<T extends { id: string; title: string; category: string }>(
  wantedText: string | null,
  candidates: T[],
  threshold = 0.3,
): string | null {
  if (!wantedText || candidates.length === 0) return null;

  let bestId: string | null = null;
  let bestScore = threshold;
  for (const candidate of candidates) {
    const score = textSimilarity(wantedText, `${candidate.category} ${candidate.title}`);
    if (score > bestScore) {
      bestScore = score;
      bestId = candidate.id;
    }
  }
  return bestId;
}
