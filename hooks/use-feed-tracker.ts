"use client";

import { useEffect, useRef } from "react";
import { FEED_EVENT_TUNING } from "@/lib/feed/constants";
import { DwellClock, FeedEventBuffer, postFeedEvents } from "@/lib/feed/tracker";
import type { FeedEventType } from "@/types";

interface UseFeedTrackerOptions {
  enabled: boolean;
  activeListingId: string | null;
  activePosition: number;
}

export function useFeedTracker({
  enabled,
  activeListingId,
  activePosition,
}: UseFeedTrackerOptions) {
  const bufferRef = useRef<FeedEventBuffer | null>(null);
  const currentClockRef = useRef<{ listingId: string; clock: DwellClock } | null>(null);
  const positionRef = useRef(activePosition);

  if (!bufferRef.current) {
    bufferRef.current = new FeedEventBuffer({
      maxBatch: FEED_EVENT_TUNING.maxBatch,
      onFlush: postFeedEvents,
    });
  }

  useEffect(() => {
    positionRef.current = activePosition;
  }, [activePosition]);

  useEffect(() => {
    if (!enabled) return;

    const intervalId = window.setInterval(() => {
      bufferRef.current?.flush();
    }, FEED_EVENT_TUNING.flushIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      bufferRef.current?.flush();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      if (currentClockRef.current) {
        const { listingId, clock } = currentClockRef.current;
        const dwellMs = clock.stop();
        if (dwellMs >= FEED_EVENT_TUNING.minImpressionMs) {
          bufferRef.current?.push({
            listingId,
            type: "impression",
            dwellMs: Math.min(dwellMs, FEED_EVENT_TUNING.maxDwellMs),
            position: positionRef.current,
          });
        }
        currentClockRef.current = null;
      }
      return;
    }

    if (currentClockRef.current && currentClockRef.current.listingId !== activeListingId) {
      const { listingId, clock } = currentClockRef.current;
      const dwellMs = clock.stop();
      if (dwellMs >= FEED_EVENT_TUNING.minImpressionMs) {
        bufferRef.current?.push({
          listingId,
          type: "impression",
          dwellMs: Math.min(dwellMs, FEED_EVENT_TUNING.maxDwellMs),
          position: positionRef.current,
        });
      }
      currentClockRef.current = null;
    }

    if (!activeListingId) return;

    const clock = new DwellClock();
    clock.start();
    currentClockRef.current = { listingId: activeListingId, clock };

    const handleVisibility = () => {
      if (!currentClockRef.current) return;
      if (document.visibilityState === "hidden") {
        currentClockRef.current.clock.pause();
      } else {
        currentClockRef.current.clock.start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);

      if (currentClockRef.current?.listingId === activeListingId) {
        const dwellMs = currentClockRef.current.clock.stop();
        if (dwellMs >= FEED_EVENT_TUNING.minImpressionMs) {
          bufferRef.current?.push({
            listingId: activeListingId,
            type: "impression",
            dwellMs: Math.min(dwellMs, FEED_EVENT_TUNING.maxDwellMs),
            position: positionRef.current,
          });
        }
        currentClockRef.current = null;
      }
    };
  }, [activeListingId, enabled]);

  const track = (type: FeedEventType, listingId: string, position = positionRef.current) => {
    if (!enabled || !listingId) return;

    bufferRef.current?.push({
      listingId,
      type,
      position,
    });
  };

  return { track };
}
