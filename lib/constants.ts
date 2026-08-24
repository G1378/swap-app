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
