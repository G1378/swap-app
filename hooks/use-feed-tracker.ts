"use client";

import { useCallback, useEffect, useRef } from "react";
import { FEED_EVENT_TUNING } from "@/lib/feed/constants";
import { isPersistedListingId } from "@/lib/feed/ids";
import { DwellClock, FeedEventBuffer, postFeedEvents } from "@/lib/feed/tracker";
import type { FeedEventType } from "@/types";

interface UseFeedTrackerOptions {
  /** Tracking only runs for signed-in users (events are stored per user). */
  enabled: boolean;
  /** The listing currently on screen, if any. */
  activeListingId: string | null;
  /** Its position in the loaded feed. */
  activePosition: number;
}

/**
 * Records what a signed-in viewer does in the Discover reel:
 *
 *  - an `impression` for every card, with how long it was on screen
 *    (time is only counted while the tab is visible), emitted when the
 *    card leaves the screen;
 *  - discrete actions (`info_open`, `swap_started`, `pass`) via `track`.
 *
 * Events are buffered and sent in batches. Nothing here can throw into or
 * block the UI: see postFeedEvents.
 */
export function useFeedTracker({
  enabled,
  activeListingId,
  activePosition,
}: UseFeedTrackerOptions) {
  const bufferRef = useRef<FeedEventBuffer | null>(null);
  if (bufferRef.current === null) {
    bufferRef.current = new FeedEventBuffer({
      onFlush: postFeedEvents,
      maxBatch: FEED_EVENT_TUNING.maxBatch,
    });
  }
  const clockRef = useRef<DwellClock | null>(null);
  if (clockRef.current === null) clockRef.current = new DwellClock();

  const positionRef = useRef(activePosition);
  positionRef.current = activePosition;
  const activeRef = useRef<{ listingId: string; position: number } | null>(null);

  // Impression per card: the clock starts when a card becomes active and
  // the event is written when it stops being active (or on unmount).
  useEffect(() => {
    if (!enabled || !activeListingId || !isPersistedListingId(activeListingId)) return;

    const buffer = bufferRef.current!;
    const clock = clockRef.current!;
    const card = { listingId: activeListingId, position: positionRef.current };
    activeRef.current = card;
    if (document.visibilityState === "visible") clock.start();

    return () => {
      const dwellMs = Math.min(clock.stop(), FEED_EVENT_TUNING.maxDwellMs);
      if (dwellMs >= FEED_EVENT_TUNING.minImpressionMs) {
        buffer.push({
          listingId: card.listingId,
          type: "impression",
          dwellMs,
          position: card.position,
        });
      }
      activeRef.current = null;
    };
  }, [enabled, activeListingId]);

  // Delivery: flush on a timer, and whenever the tab is hidden or the page
  // is closed. Declared after the impression effect on purpose — React runs
  // cleanups in declaration order, so on unmount the final impression is
  // queued before this cleanup's last flush.
  useEffect(() => {
    if (!enabled) return;

    const buffer = bufferRef.current!;
    const clock = clockRef.current!;

    const interval = window.setInterval(() => buffer.flush(), FEED_EVENT_TUNING.flushIntervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clock.pause();
        buffer.flush();
      } else if (activeRef.current) {
        clock.start();
      }
    }
    function handlePageHide() {
      buffer.flush();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      buffer.flush();
    };
  }, [enabled]);

  const track = useCallback(
    (type: Exclude<FeedEventType, "impression">, listingId: string) => {
      if (!enabled || !isPersistedListingId(listingId)) return;
      bufferRef.current!.push({
        listingId,
        type,
        position: activeRef.current?.position ?? positionRef.current,
      });
    },
    [enabled],
  );

  return { track };
}
