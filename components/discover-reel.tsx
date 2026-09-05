"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, PackageOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { REEL_GESTURE } from "@/lib/constants";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SwapRequestDialog } from "@/components/swap-request-dialog";
import { ReelCard } from "@/components/reel-card";
import { StreakXpBar } from "@/components/gamification/streak-xp-bar";
import type { GamificationProfile, Listing, Profile } from "@/types";

interface DiscoverReelProps {
  listings: Listing[];
  owners: Record<string, Pick<Profile, "username" | "fullName" | "avatarUrl">>;
  currentUserId: string | null;
  /** The signed-in user's own available listings — the inventory offered
   * when building a swap request. Empty (and unused) when logged out. */
  myListings: Listing[];
  initialWishlistedListingIds: string[];
  /** listingId -> the id of a pending/accepted swap request the current
   * user already sent for it, so a repeat swipe-right jumps straight to
   * that request instead of re-opening the offer builder. */
  activeSwapRequestByListingId: Record<string, string>;
  /** null when logged out, or if the profile hasn't been provisioned yet —
   * StreakXpBar degrades gracefully to just the position pill either way. */
  gamification: GamificationProfile | null;
}

// --- Gesture tuning ---------------------------------------------------
//
// Direction convention (deliberately NOT the same raw sign for every input
// device — each is normalized to what that device's "forward" gesture
// conventionally means, matching how reels/feeds already work elsewhere):
//   - Touch/pointer drag: swiping UP advances to the next card (this is
//     direct-manipulation physics — the card stays glued to the finger —
//     and matches every reel-style app, e.g. TikTok/Reels/Shorts).
//   - Mouse wheel / trackpad: scrolling DOWN advances (the same convention
//     as scrolling down any normal feed).
//   - Keyboard: ArrowDown advances, ArrowUp goes back.
// All three land on the same outcome ("the down-ish gesture moves you
// forward"), they just start from different raw deltas. If this ever feels
// backwards on a real device, the only lines that encode direction are the
// `crossedNext`/`crossedPrev` checks below and the wheel handler.
const {
  verticalThreshold,
  horizontalThreshold,
  axisLockThreshold,
  flickVelocity,
  settleMs,
  wheelThreshold,
} = REEL_GESTURE;

type InfoDialogState =
  | { type: "own"; listing: Listing }
  | { type: "unavailable"; listing: Listing }
  | { type: "no-inventory"; listing: Listing };

export function DiscoverReel({
  listings,
  owners,
  currentUserId,
  myListings,
  initialWishlistedListingIds,
  activeSwapRequestByListingId,
  gamification,
}: DiscoverReelProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    startTime: number;
  } | null>(null);

  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [axis, setAxis] = useState<"x" | "y" | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [swapListing, setSwapListing] = useState<Listing | null>(null);
  const [infoDialog, setInfoDialog] = useState<InfoDialogState | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Re-entrancy guard for goTo, kept as a ref rather than state: it never
  // drives any rendered output, and a ref stays correct instantly across
  // every input handler's closure without forcing goTo to change identity
  // mid-transition (which would tear down/rebuild the wheel + keyboard
  // listeners while a transition was still in flight).
  const isAnimatingRef = useRef(false);

  const wishlistedIds = useMemo(
    () => new Set(initialWishlistedListingIds),
    [initialWishlistedListingIds],
  );
  const anyDialogOpen = Boolean(swapListing || infoDialog);

  // Measure the viewport so a page transition can animate a card exactly
  // one screen-height off before the next one settles into place.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      sizeRef.current = { width: el.clientWidth, height: el.clientHeight };
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handleChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // This page is a self-contained, full-bleed viewport — don't let the
  // outer page scroll reveal the navbar/footer while swiping.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const goTo = useCallback(
    (direction: 1 | -1) => {
      if (isAnimatingRef.current) return;
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex > listings.length - 1) {
        // Nothing further that way — snap back rather than paging.
        setIsSettling(!reducedMotion);
        setDrag({ x: 0, y: 0 });
        window.setTimeout(
          () => setIsSettling(false),
          reducedMotion ? 0 : settleMs,
        );
        return;
      }

      isAnimatingRef.current = true;
      setIsSettling(!reducedMotion);
      setDrag({ x: 0, y: -direction * sizeRef.current.height });

      window.setTimeout(
        () => {
          setIndex(nextIndex);
          setIsSettling(false);
          setDrag({ x: 0, y: 0 });
          setAxis(null);
          isAnimatingRef.current = false;
        },
        reducedMotion ? 0 : settleMs,
      );
    },
    [index, listings.length, reducedMotion],
  );

  const triggerSwapFlow = useCallback(
    (listing: Listing | undefined) => {
      if (!listing) return;

      if (!currentUserId) {
        router.push("/login");
        return;
      }
      if (listing.ownerId === currentUserId) {
        setInfoDialog({ type: "own", listing });
        return;
      }
      if (listing.status !== "available") {
        setInfoDialog({ type: "unavailable", listing });
        return;
      }
      const activeRequestId = activeSwapRequestByListingId[listing.id];
      if (activeRequestId) {
        router.push(`/swaps/${activeRequestId}`);
        return;
      }
      if (myListings.length === 0) {
        setInfoDialog({ type: "no-inventory", listing });
        return;
      }
      setSwapListing(listing);
    },
    [currentUserId, activeSwapRequestByListingId, myListings.length, router],
  );

  // Keyboard: ArrowUp/ArrowDown page, ArrowRight/Enter open the swap flow
  // (mirrors the swipe gestures for anyone not using touch or a mouse).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (anyDialogOpen || listings.length === 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
      )
        return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        goTo(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goTo(-1);
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        triggerSwapFlow(listings[index]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anyDialogOpen, goTo, triggerSwapFlow, listings, index]);

  // Wheel/trackpad paging. Attached manually (not via onWheel) so
  // preventDefault reliably stops the underlying page from scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || anyDialogOpen) return;

    let cooling = false;
    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      if (cooling || Math.abs(e.deltaY) < wheelThreshold) return;
      cooling = true;
      goTo(e.deltaY > 0 ? 1 : -1);
      window.setTimeout(() => {
        cooling = false;
      }, settleMs + 60);
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [anyDialogOpen, goTo]);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (anyDialogOpen || isAnimatingRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
    };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    if (!start || start.id !== e.pointerId) return;

    const dx = e.clientX - start.startX;
    const dy = e.clientY - start.startY;

    let lockedAxis = axis;
    if (!lockedAxis) {
      if (Math.abs(dx) < axisLockThreshold && Math.abs(dy) < axisLockThreshold)
        return;
      lockedAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      setAxis(lockedAxis);
    }

    // Now that this is a real drag, stop it from also scrolling the page.
    e.preventDefault();
    setDrag(lockedAxis === "x" ? { x: dx, y: 0 } : { x: 0, y: dy });
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start || start.id !== e.pointerId) return;

    const dx = e.clientX - start.startX;
    const dy = e.clientY - start.startY;
    const dt = Math.max(1, performance.now() - start.startTime);

    if (axis === "x") {
      const velocity = dx / dt;
      const crossedRight =
        dx > horizontalThreshold ||
        (dx > axisLockThreshold && velocity > flickVelocity);
      // Left has no assigned behavior yet — still detected (the drag
      // itself is visible via the live transform), just a no-op
      // spring-back on release. Wire a real action in here (e.g. a
      // "pass"/hide) once that's decided.

      if (crossedRight) {
        triggerSwapFlow(listings[index]);
      }

      setIsSettling(!reducedMotion);
      setDrag({ x: 0, y: 0 });
      window.setTimeout(
        () => setIsSettling(false),
        reducedMotion ? 0 : settleMs,
      );
      setAxis(null);
      return;
    }

    if (axis === "y") {
      const velocity = dy / dt;
      const crossedNext =
        dy < -verticalThreshold ||
        (dy < -axisLockThreshold && velocity < -flickVelocity);
      const crossedPrev =
        dy > verticalThreshold ||
        (dy > axisLockThreshold && velocity > flickVelocity);

      if (crossedNext) {
        goTo(1);
      } else if (crossedPrev) {
        goTo(-1);
      } else {
        setIsSettling(!reducedMotion);
        setDrag({ x: 0, y: 0 });
        window.setTimeout(
          () => setIsSettling(false),
          reducedMotion ? 0 : settleMs,
        );
      }
      setAxis(null);
      return;
    }

    // Movement never crossed the axis-lock threshold — this was a tap on a
    // child element (owner link, wishlist button, etc.); let it behave
    // normally and don't touch drag/axis state.
  }

  const visibleOffsets = [-1, 0, 1] as const;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto h-[calc(100dvh-8rem)] w-full touch-none select-none overflow-hidden bg-neutral-950 sm:my-6 sm:h-[min(calc(100dvh-8rem),844px)] sm:max-w-sm sm:rounded-3xl sm:shadow-2xl"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {listings.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <PackageOpen className="h-10 w-10 text-white/50" />
          <p className="text-lg font-semibold text-white">
            No listings to swipe through yet
          </p>
          <p className="max-w-xs text-sm text-white/60">
            Check back soon, or be the first to list something for others to
            find.
          </p>
          <Link href="/listings/new">
            <Button variant="secondary" size="sm" className="mt-2">
              Create a listing
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {visibleOffsets.map((offset) => {
            const i = index + offset;
            if (i < 0 || i > listings.length - 1) return null;
            const listing = listings[i];
            const relativePosition = i - index;
            const isActive = relativePosition === 0;
            const translateY = `calc(${relativePosition * 100}% + ${drag.y}px)`;
            const translateX = isActive ? drag.x : 0;
            const rotate = isActive ? drag.x * 0.02 : 0;

            return (
              <div
                key={listing.id}
                className={cn(
                  "absolute inset-0",
                  isSettling && "transition-transform duration-300 ease-out",
                )}
                style={{
                  transform: `translateY(${translateY}) translateX(${translateX}px) rotate(${rotate}deg)`,
                }}
              >
                <ReelCard
                  listing={listing}
                  owner={owners[listing.ownerId] ?? null}
                  isActive={isActive}
                  priority={isActive}
                  dragX={isActive ? drag.x : 0}
                  currentUserId={currentUserId}
                  wishlisted={wishlistedIds.has(listing.id)}
                  onOpenSwapFlow={() => triggerSwapFlow(listing)}
                />
              </div>
            );
          })}

          <Link
            href="/search"
            aria-label="Search listings"
            className="pointer-events-auto absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/50"
          >
            <Search className="h-4 w-4" />
          </Link>

          <StreakXpBar
            gamification={gamification}
            index={index}
            total={listings.length}
          />

          <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
            <button
              type="button"
              onClick={() => goTo(-1)}
              disabled={index === 0}
              aria-label="Previous listing"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-opacity hover:bg-black/60 disabled:opacity-30"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              disabled={index === listings.length - 1}
              aria-label="Next listing"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-opacity hover:bg-black/60 disabled:opacity-30"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      {swapListing && currentUserId && (
        <SwapRequestDialog
          open
          onClose={() => setSwapListing(null)}
          listing={swapListing}
          senderId={currentUserId}
          myListings={myListings}
        />
      )}

      {infoDialog && (
        <Dialog
          open
          onClose={() => setInfoDialog(null)}
          title={
            infoDialog.type === "own"
              ? "This is your listing"
              : infoDialog.type === "unavailable"
                ? infoDialog.listing.status === "pending"
                  ? "Swap already in progress"
                  : "Already swapped"
                : "List an item first"
          }
        >
          {infoDialog.type === "own" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                You can&apos;t request a swap on your own listing.
              </p>
              <Link
                href={`/listings/${infoDialog.listing.id}/edit`}
                className="self-start"
              >
                <Button variant="outline" size="sm">
                  Edit listing
                </Button>
              </Link>
            </div>
          )}
          {infoDialog.type === "unavailable" && (
            <p className="text-sm text-muted-foreground">
              {infoDialog.listing.status === "pending"
                ? "This item already has a swap in progress."
                : "This item has already been swapped."}
            </p>
          )}
          {infoDialog.type === "no-inventory" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                List an available item of your own before requesting a swap.
              </p>
              <Link href="/listings/new" className="self-start">
                <Button size="sm">Create a listing</Button>
              </Link>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
