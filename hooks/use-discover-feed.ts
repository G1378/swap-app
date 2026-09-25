"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FEED_PAGE_SIZE, FEED_PREFETCH_THRESHOLD } from "@/lib/feed/constants";
import type { FeedOwner, Listing } from "@/types";

interface UseDiscoverFeedOptions {
  initialListings: Listing[];
  initialOwners: Record<string, FeedOwner>;
  initialActiveSwapRequestByListingId: Record<string, string>;
  initialHasMore: boolean;
  currentIndex: number;
}

interface RevealMeta {
  owner: FeedOwner | null;
  activeSwapRequestId: string | null;
}

export function useDiscoverFeed({
  initialListings,
  initialOwners,
  initialActiveSwapRequestByListingId,
  initialHasMore,
  currentIndex,
}: UseDiscoverFeedOptions) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [owners, setOwners] = useState<Record<string, FeedOwner>>(initialOwners);
  const [activeSwapRequestByListingId, setActiveSwapRequestByListingId] =
    useState<Record<string, string>>(initialActiveSwapRequestByListingId);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setListings(initialListings);
  }, [initialListings]);

  useEffect(() => {
    setOwners(initialOwners);
  }, [initialOwners]);

  useEffect(() => {
    setActiveSwapRequestByListingId(initialActiveSwapRequestByListingId);
  }, [initialActiveSwapRequestByListingId]);

  useEffect(() => {
    setHasMore(initialHasMore);
  }, [initialHasMore]);

  const loadedIds = useMemo(
    () => listings.map((listing) => listing.id),
    [listings],
  );

  useEffect(() => {
    if (!hasMore || isLoading || listings.length === 0) return;
    if (currentIndex < listings.length - FEED_PREFETCH_THRESHOLD) return;

    let cancelled = false;

    async function loadMore() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/discover/feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            limit: FEED_PAGE_SIZE,
            excludeIds: loadedIds,
          }),
        });

        if (!response.ok) {
          if (mountedRef.current) setHasMore(false);
          return;
        }

        const page: {
          listings: Listing[];
          owners: Record<string, FeedOwner>;
          activeSwapRequestByListingId: Record<string, string>;
          hasMore: boolean;
        } = await response.json();

        if (cancelled || !mountedRef.current) return;

        setListings((previous) => {
          const existing = new Set(previous.map((listing) => listing.id));
          const next = [...previous];

          for (const listing of page.listings) {
            if (!existing.has(listing.id)) {
              next.push(listing);
              existing.add(listing.id);
            }
          }

          return next;
        });

        setOwners((previous) => ({ ...previous, ...page.owners }));
        setActiveSwapRequestByListingId((previous) => ({
          ...previous,
          ...page.activeSwapRequestByListingId,
        }));
        setHasMore(page.hasMore);
      } catch {
        if (mountedRef.current) setHasMore(false);
      } finally {
        if (!cancelled && mountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadMore();

    return () => {
      cancelled = true;
    };
  }, [currentIndex, hasMore, isLoading, loadedIds, listings.length]);

  const removeListing = useCallback(
    (listingId: string) => {
      const index = listings.findIndex((listing) => listing.id === listingId);
      if (index === -1) return null;

      const next = listings.filter((listing) => listing.id !== listingId);
      setListings(next);
      return { index, remaining: next.length };
    },
    [listings],
  );

  const restoreListing = useCallback((listing: Listing, atIndex: number) => {
    const index = Math.max(0, Math.min(atIndex, listings.length));

    setListings((previous) => {
      const next = [...previous];
      const insertionIndex = Math.max(0, Math.min(index, next.length));
      next.splice(insertionIndex, 0, listing);
      return next;
    });

    return index;
  }, [listings.length]);

  const indexOfListing = useCallback(
    (listingId: string) => listings.findIndex((listing) => listing.id === listingId),
    [listings],
  );

  const revealListing = useCallback(
    (listing: Listing, meta: RevealMeta, insertionIndex: number) => {
      const existingIndex = listings.findIndex((item) => item.id === listing.id);
      if (existingIndex !== -1) {
        return existingIndex;
      }

      const nextIndex = Math.max(0, Math.min(insertionIndex + 1, listings.length));

      setListings((previous) => {
        const next = [...previous];
        next.splice(nextIndex, 0, listing);
        return next;
      });

      setOwners((previous) => {
        return meta.owner ? { ...previous, [listing.ownerId]: meta.owner } : previous;
      });

      if (meta.activeSwapRequestId) {
        setActiveSwapRequestByListingId((previous) => ({
          ...previous,
          [listing.id]: meta.activeSwapRequestId,
        }));
      }

      return nextIndex;
    },
    [listings],
  );

  return {
    listings,
    owners,
    activeSwapRequestByListingId,
    hasMore,
    isLoading,
    removeListing,
    restoreListing,
    indexOfListing,
    revealListing,
  };
}
