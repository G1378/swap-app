import type { ReportReason } from "@/types";

/**
 * Single source of truth for listing categories/conditions — previously
 * duplicated as a local const inside listing-form.tsx. Also used by the
 * category browse pages and Discover's category chips.
 */
export const LISTING_CATEGORIES = [
  "Gaming",
  "LEGO",
  "Camera Equipment",
  "Musical Instruments",
  "PC Components",
  "Other",
] as const;

export const LISTING_CONDITIONS = ["New", "Like new", "Excellent", "Good", "Fair"] as const;

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "scam_or_fraud", label: "Scam or fraud" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
];

/**
 * Gesture tuning for the Discover reel (components/discover-reel.tsx +
 * reel-card.tsx). Lives here, not in either component, so both can import
 * it without one depending on the other.
 */
export const REEL_GESTURE = {
  /** px drag distance that pages to the next/previous card */
  verticalThreshold: 80,
  /** px drag distance that opens the swap flow */
  horizontalThreshold: 110,
  /** px of movement before a gesture commits to horizontal vs vertical */
  axisLockThreshold: 8,
  /** px/ms — a fast short flick counts even under the distance threshold */
  flickVelocity: 0.5,
  /** ms for the page-settle / snap-back transition */
  settleMs: 300,
  /** minimum |deltaY| per wheel tick before it counts as an intentional page */
  wheelThreshold: 12,
} as const;
