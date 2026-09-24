"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Undo2 } from "lucide-react";
import { PASS_REASONS, PASS_TOAST_MS, PASS_TOAST_THANKS_MS } from "@/lib/feed/constants";
import type { PassReason } from "@/types";

interface PassToastProps {
  /** Title of the dismissed listing — read out to screen-reader users. */
  listingTitle: string;
  /** True when saving the pass failed and the card was put back. */
  failed: boolean;
  /** Reasons can only be saved for signed-in users. */
  canGiveReason: boolean;
  /** The reason already chosen, if any. */
  reason: PassReason | null;
  onUndo: () => void;
  onReason: (reason: PassReason) => void;
  onDismiss: () => void;
}

/**
 * Confirmation shown after a "not interested" swipe: an Undo button and
 * optional one-tap reasons. It sits at the top of the reel rather than the
 * bottom because the bottom is where the next card's title and "wants"
 * text are, and that's what the viewer is reading right now.
 *
 * Dismisses itself after a few seconds, but pauses while the pointer is
 * over it or focus is inside it, so it can't vanish mid-tap. Mount it with
 * a `key` per dismissed listing so its state resets for each pass.
 */
export function PassToast({
  listingTitle,
  failed,
  canGiveReason,
  reason,
  onUndo,
  onReason,
  onDismiss,
}: PassToastProps) {
  const [paused, setPaused] = useState(false);

  // The reel re-renders on every pointer move while dragging, so a new
  // onDismiss identity arrives constantly. Reading it through a ref keeps
  // the timer below from restarting each time.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const durationMs = reason ? PASS_TOAST_THANKS_MS : PASS_TOAST_MS;
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onDismissRef.current(), durationMs);
    return () => window.clearTimeout(timer);
  }, [paused, durationMs, reason]);

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  return (
    <div
      role="status"
      aria-live="polite"
      // Keep taps here from starting a swipe on the reel underneath.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="absolute inset-x-3 top-14 z-20 flex flex-col gap-2 rounded-2xl bg-black/75 p-3 text-white shadow-lg backdrop-blur"
    >
      {failed ? (
        <p className="text-sm font-medium">
          Couldn&apos;t save that. The listing is back in your feed.
          <span className="sr-only">: {listingTitle}</span>
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium">
              Marked not interested
              <span className="sr-only">: {listingTitle}</span>
            </p>
            <button
              type="button"
              onClick={onUndo}
              className={`flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-white/90 ${focusRing}`}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              Undo
            </button>
          </div>

          {reason ? (
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Thanks, noted.
            </p>
          ) : (
            canGiveReason && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-white/60">Why?</span>
                {PASS_REASONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onReason(option.value)}
                    className={`rounded-full border border-white/25 px-2.5 py-1.5 text-xs text-white/90 hover:bg-white/15 ${focusRing}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
