import type { FeedEventInput } from "@/types";

/**
 * Framework-free building blocks for behavioural tracking. They're plain
 * classes (no React, no fetch) so they can be unit-tested directly; the
 * wiring to React lifecycles lives in hooks/use-feed-tracker.ts.
 */

/**
 * A stopwatch that can pause. Dwell time should only count while the card
 * is actually visible, so the tracker pauses it when the tab is hidden and
 * resumes when it comes back.
 */
export class DwellClock {
  private accumulatedMs = 0;
  private startedAt: number | null = null;

  constructor(
    private readonly now: () => number = () =>
      typeof performance !== "undefined" ? performance.now() : Date.now(),
  ) {}

  start(): void {
    if (this.startedAt === null) this.startedAt = this.now();
  }

  pause(): void {
    if (this.startedAt !== null) {
      this.accumulatedMs += this.now() - this.startedAt;
      this.startedAt = null;
    }
  }

  /** Stops the clock, returns total elapsed ms, and resets to zero. */
  stop(): number {
    this.pause();
    const total = this.accumulatedMs;
    this.accumulatedMs = 0;
    return Math.round(total);
  }
}

interface FeedEventBufferOptions {
  /** Called with a batch whenever the buffer is flushed. */
  onFlush: (events: FeedEventInput[]) => void;
  /** Flushes immediately once this many events are waiting. */
  maxBatch: number;
}

/** Collects events and hands them over in batches, so a fast swiper
 * produces a handful of requests rather than one per card. */
export class FeedEventBuffer {
  private queue: FeedEventInput[] = [];

  constructor(private readonly options: FeedEventBufferOptions) {}

  get size(): number {
    return this.queue.length;
  }

  push(event: FeedEventInput): void {
    this.queue.push(event);
    if (this.queue.length >= this.options.maxBatch) this.flush();
  }

  flush(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue;
    this.queue = [];
    this.options.onFlush(batch);
  }
}

/**
 * Sends a batch to the server. Best-effort by design: tracking must never
 * break or slow the feed, so failures are swallowed and the batch is
 * dropped. `keepalive` lets the request finish even if it's fired while the
 * page is being closed or navigated away from.
 */
export function postFeedEvents(events: FeedEventInput[]): void {
  if (events.length === 0) return;
  void fetch("/api/discover/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {
    // Intentionally ignored — see above.
  });
}
