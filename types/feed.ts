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

/**
 * A Listing as returned by `get_discover_feed` (see
 * prisma/migrations_manual/0015), carrying the ranking signals alongside
 * the listing itself so cards can explain *why* something is near the
 * top — a "good swap odds" / "matches what you want" badge, say — without
 * a second request.
 *
 * Listings from anywhere else (search results, a user's own listings, a
 * wishlist) stay plain `Listing`; these fields only exist on rows that
 * actually went through the ranking function. A listing revealed into the
 * feed from search (see hooks/use-discover-feed.ts) gets zeroed-out
 * defaults here, since it was never scored against the viewer.
 */
export interface DiscoverListing extends Listing {
  /** True if this listing's owner has wishlisted one of the viewer's own
   * available listings — the strongest signal get_discover_feed has, and
   * what puts a listing first regardless of the two scores below. Never
   * shown to the viewer as "they saved your item" — see the brainstorm
   * notes on why that stays a silent ranking signal, not a visible one. */
  ownerWishlistedMine: boolean;
  /** 0–1: how well this listing matches what the viewer said they want on
   * one of their own listings (pg_trgm similarity, lexical not semantic —
   * see the migration's comments for what that does and doesn't catch). */
  wantScore: number;
  /** 0–1: how well one of the viewer's own listings matches what this
   * listing's owner is asking for. Weighted higher than wantScore in
   * get_discover_feed's ranking — see prisma/migrations_manual/0015. */
  acceptScore: number;
}

/** One page of the Discover feed plus everything a card needs to render,
 * so the client never has to make follow-up requests per card. */
export interface DiscoverFeedPage {
  listings: DiscoverListing[];
  /** ownerId -> byline info. Mock listings simply have no entry. */
  owners: Record<string, FeedOwner>;
  /** listingId -> id of a pending/accepted request the viewer already sent. */
  activeSwapRequestByListingId: Record<string, string>;
  /** False once the server has nothing further to send. */
  hasMore: boolean;
}
