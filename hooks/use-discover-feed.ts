"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FEED_MAX_EXCLUDE_IDS,
  FEED_PAGE_SIZE,
  FEED_PREFETCH_THRESHOLD,
} from "@/lib/feed/constants";
import { isPersistedListingId } from "@/lib/feed/ids";
import type { DiscoverFeedPage, DiscoverListing, FeedOwner, Listing } from "@/types";

interface UseDiscoverFeedOptions {
  initialListings: DiscoverListing[];
  initialOwners: Record<string, FeedOwner>;
  initialActiveSwapRequestByListingId: Record<string, string>;
  initialHasMore: boolean;
  /** Index of the card on screen. Drives when the next page is prefetched. */
  currentIndex: number;
}

/** Extra data a listing needs when it's inserted into the feed from
 * outside the normal paging flow (i.e. picked from search). */
export interface RevealExtras {
  owner?: FeedOwner | null;
  /** Id of a pending/accepted request the viewer already sent for it. */
  activeSwapRequestId?: string | null;
}

function insertAt<T>(items: T[], index: number, item: T): T[] {
  const at = Math.max(0, Math.min(index, items.length));
  return [...items.slice(0, at), item, ...items.slice(at)];
}

/** A listing revealed from search never went through get_discover_feed's
 * ranking, so it has no real want/accept scores against this viewer —
 * filled in as zero/false rather than left undefined. */
function toUnscoredDiscoverListing(listing: Listing): DiscoverListing {
  return { ...listing, ownerWishlistedMine: false, wantScore: 0, acceptScore: 0 };
}

/**
 * Owns the Discover reel's list of cards: the server-rendered first page,
 * background loading of later pages, and local edits (remove a card that
 * was passed on, restore it on undo, splice in a search result).
 *
 * Paging sends the ids already loaded and asks for "the next batch of the
 * rest" (see lib/feed/queries.ts) instead of using an offset, so removing
 * cards can't make the window skip listings.
 */
export function useDiscoverFeed({
  initialListings,
  initialOwners,
  initialActiveSwapRequestByListingId,
  initialHasMore,
  currentIndex,
}: UseDiscoverFeedOptions) {
  const [listings, setListings] = useState<DiscoverListing[]>(initialListings);
  const [owners, setOwners] = useState(initialOwners);
  const [activeSwapRequestByListingId, setActiveSwapRequestByListingId] = useState(
    initialActiveSwapRequestByListingId,
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Index at which the last page request failed. Auto-retry pauses there so
  // a broken connection doesn't loop; moving to another card retries.
  const [failedAtIndex, setFailedAtIndex] = useState<number | null>(null);

  // Every id loaded this session, including cards since passed on — sent to
  // the server so it never re-serves them, even if a pass hasn't finished
  // saving yet. A Set iterates in insertion order, so slicing the tail
  // keeps the most recent ids.
  const seenIdsRef = useRef<Set<string>>(new Set(initialListings.map((l) => l.id)));
  const loadingRef = useRef(false);
  // Mirrors of state for callbacks that must read the latest value
  // synchronously (removal/restore need the index of a card right now).
  const listingsRef = useRef(listings);
  listingsRef.current = listings;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      const excludeIds = Array.from(seenIdsRef.current)
        .filter(isPersistedListingId)
        .slice(-FEED_MAX_EXCLUDE_IDS);

      const response = await fetch("/api/discover/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: FEED_PAGE_SIZE, excludeIds }),
      });
      if (!response.ok) throw new Error(`Feed request failed with ${response.status}.`);

      const page = (await response.json()) as DiscoverFeedPage;
      const fresh = page.listings.filter((l) => !seenIdsRef.current.has(l.id));
      fresh.forEach((l) => seenIdsRef.current.add(l.id));

      setListings((prev) => [...prev, ...fresh]);
      setOwners((prev) => ({ ...prev, ...page.owners }));
      setActiveSwapRequestByListingId((prev) => ({
        ...prev,
        ...page.activeSwapRequestByListingId,
      }));
      // A page with nothing new means there's nothing further to serve,
      // whatever `hasMore` claimed — stop asking rather than loop.
      setHasMore(page.hasMore && fresh.length > 0);
      setFailedAtIndex(null);
    } catch (error) {
      console.error("Could not load more listings.", error);
      setFailedAtIndex(currentIndexRef.current);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, []);

  // Prefetch the next page while the viewer is still a few cards away from
  // the end of what's loaded.
  useEffect(() => {
    if (!hasMore || isLoadingMore || failedAtIndex === currentIndex) return;
    const cardsAhead = listings.length - 1 - currentIndex;
    if (cardsAhead > FEED_PREFETCH_THRESHOLD) return;
    void loadMore();
  }, [hasMore, isLoadingMore, failedAtIndex, currentIndex, listings.length, loadMore]);

  /** Removes a card and reports where it was (so it can be put back) and
   * how many cards are left. `remaining` is read at call time on purpose:
   * a prefetched page may have landed since the caller last rendered. */
  const removeListing = useCallback(
    (listingId: string): { listing: DiscoverListing; index: number; remaining: number } | null => {
      const index = listingsRef.current.findIndex((l) => l.id === listingId);
      if (index === -1) return null;
      const listing = listingsRef.current[index];
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      return { listing, index, remaining: listingsRef.current.length - 1 };
    },
    [],
  );

  /** Puts a removed card back at (or as near as possible to) its old
   * position, with its original ranking scores intact (it came from
   * removeListing, so it's always already a DiscoverListing). Returns the
   * index it ended up at. */
  const restoreListing = useCallback((listing: DiscoverListing, atIndex: number): number => {
    const existing = listingsRef.current.findIndex((l) => l.id === listing.id);
    if (existing !== -1) return existing;

    const at = Math.max(0, Math.min(atIndex, listingsRef.current.length));
    setListings((prev) => insertAt(prev, at, listing));
    return at;
  }, []);

  /** Makes a listing from outside the paging flow (a search result) part
   * of the feed, right after the current card. Search results are plain
   * Listings — never scored against this viewer — so they're inserted
   * with zeroed-out ranking signals (see toUnscoredDiscoverListing).
   * Returns the index it ended up at. */
  const revealListing = useCallback(
    (listing: Listing, extras: RevealExtras, afterIndex: number): number => {
      const existing = listingsRef.current.findIndex((l) => l.id === listing.id);
      if (existing !== -1) return existing;

      const at = Math.min(afterIndex + 1, listingsRef.current.length);
      seenIdsRef.current.add(listing.id);
      setListings((prev) => insertAt(prev, at, toUnscoredDiscoverListing(listing)));

      // Narrowed to local consts first, then checked, rather than checking
      // `extras.owner` / `extras.activeSwapRequestId` directly: narrowing
      // a plain local variable is the most robust form TypeScript
      // supports, so this can't be tripped up by how `extras` ends up
      // typed at a given call site.
      const owner = extras.owner ?? null;
      if (owner !== null) {
        setOwners((prev) => ({ ...prev, [listing.ownerId]: owner }));
      }

      const activeSwapRequestId = extras.activeSwapRequestId ?? null;
      if (activeSwapRequestId !== null) {
        setActiveSwapRequestByListingId((prev) => ({
          ...prev,
          [listing.id]: activeSwapRequestId,
        }));
      }

      return at;
    },
    [],
  );

  const indexOfListing = useCallback(
    (listingId: string): number => listingsRef.current.findIndex((l) => l.id === listingId),
    [],
  );

  return {
    listings,
    owners,
    activeSwapRequestByListingId,
    hasMore,
    isLoadingMore,
    removeListing,
    restoreListing,
    revealListing,
    indexOfListing,
  };
}
