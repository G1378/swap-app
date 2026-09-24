import type { PassReason } from "@/types";

/** Cards per feed request. The server is asked for one extra row to learn
 * whether another page exists, so the database sees PAGE_SIZE + 1. */
export const FEED_PAGE_SIZE = 20;

/** Largest page a client may request. The database function clamps at 50
 * including the lookahead row, so this leaves headroom. */
export const FEED_MAX_PAGE_SIZE = 40;

/** Start fetching the next page once this few cards remain ahead of the
 * one on screen, so the feed never visibly runs dry mid-swipe. */
export const FEED_PREFETCH_THRESHOLD = 5;

/** How many already-loaded listing ids a client sends to skip. Beyond this
 * the oldest are dropped: at that point the user has swiped through a very
 * long session and a rare repeat is acceptable. */
export const FEED_MAX_EXCLUDE_IDS = 500;

/** Options offered in the toast after a "not interested" swipe. */
export const PASS_REASONS: ReadonlyArray<{ value: PassReason; label: string }> = [
  { value: "wrong_category", label: "Wrong category" },
  { value: "not_my_style", label: "Not my style" },
  { value: "too_far", label: "Too far away" },
  { value: "already_seen", label: "Already seen it" },
];

/** How long the "Not interested" toast stays before dismissing itself. It
 * pauses while hovered or focused, so it never disappears mid-tap. */
export const PASS_TOAST_MS = 7000;

/** How long the "Thanks" confirmation stays after choosing a reason. */
export const PASS_TOAST_THANKS_MS = 1500;

export const FEED_EVENT_TUNING = {
  /** ms between background flushes of the event buffer */
  flushIntervalMs: 5000,
  /** Largest batch accepted per request (also flushes early when reached) */
  maxBatch: 50,
  /** Impressions shorter than this are noise (fast flicks, React strict-mode
   * remounts) and aren't recorded. */
  minImpressionMs: 300,
  /** Dwell is capped so a phone left open on a card doesn't skew averages. */
  maxDwellMs: 5 * 60 * 1000,
} as const;
