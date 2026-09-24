import type { Listing, Profile } from "@/types";

/** Why someone swiped a listing away. Mirrors the check constraint on
 * `listing_passes.reason` (prisma/migrations_manual/0014). */
export type PassReason = "wrong_category" | "not_my_style" | "too_far" | "already_seen";

/** Mirrors the check constraint on `listing_events.event_type`. */
export type FeedEventType = "impression" | "info_open" | "swap_started" | "pass";

/** One behavioural event, as sent from the browser to
 * POST /api/discover/events. */
export interface FeedEventInput {
  listingId: string;
  type: FeedEventType;
  /** Only meaningful for `impression`: how long the card was on screen. */
  dwellMs?: number;
  /** Position of the card in the loaded feed when the event happened. */
  position?: number;
}

/** The slice of a profile shown on a card's byline. */
export type FeedOwner = Pick<Profile, "username" | "fullName" | "avatarUrl">;

/** One page of the Discover feed plus everything a card needs to render,
 * so the client never has to make follow-up requests per card. */
export interface DiscoverFeedPage {
  listings: Listing[];
  /** ownerId -> byline info. Mock listings simply have no entry. */
  owners: Record<string, FeedOwner>;
  /** listingId -> id of a pending/accepted request the viewer already sent. */
  activeSwapRequestByListingId: Record<string, string>;
  /** False once the server has nothing further to send. */
  hasMore: boolean;
}
