import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts (e.g. "p-2" vs "p-4")
 * the same way shadcn/ui components expect.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compact relative time string, e.g. "3 days ago". Shared by review cards,
 * the notification bell, and anywhere else that shows a timestamp inline.
 */
export function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** Formats a cents amount as USD, e.g. 1500 -> "$15.00". Used for the cash
 * top-up shown on swap offers. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Parses a dollar-amount input string into cents, e.g. "15.5" -> 1550.
 * Never throws — invalid or negative input just becomes 0. */
export function dollarsToCents(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}
