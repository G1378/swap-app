"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, PackageOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { REEL_GESTURE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { getOwnersByListingOwnerId } from "@/lib/listings";
import { findActiveSwapRequestsForListings } from "@/lib/swap-requests";
import { useDiscoverFeed } from "@/hooks/use-discover-feed";
import { useFeedTracker } from "@/hooks/use-feed-tracker";
import { recordPass, setPassReason, undoPass } from "@/lib/feed/passes";
import { isPersistedListingId } from "@/lib/feed/ids";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SwapRequestDialog } from "@/components/swap-request-dialog";
import { ReelCard } from "@/components/reel-card";
import { PassToast } from "@/components/pass-toast";
import { StreakXpBar } from "@/components/gamification/streak-xp-bar";
import { SearchOverlay } from "@/components/search-overlay";
import type { FeedOwner, GamificationProfile, Listing, PassReason, Profile } from "@/types";

interface DiscoverReelProps {
  /** The server-rendered first page — see app/discover/page.tsx, which
   * builds this via lib/feed/queries.ts. Later pages load in the
   * background as the viewer nears the end (see useDiscoverFeed). */
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
  /** True if the server has more pages beyond this first one. */
  initialHasMore: boolean;
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
//     and matches every reel-style app, e.g. TikTok/Reels/Shorts). Swiping
//     RIGHT opens the swap flow; swiping LEFT dismisses the card as "not
//     interested" (mirrors Tinder-style swipe-to-pass).
//   - Mouse wheel / trackpad: scrolling DOWN advances (the same convention
//     as scrolling down any normal feed).
//   - Keyboard: ArrowDown advances, ArrowUp goes back, ArrowRight/Enter
//     opens the swap flow.
// If this ever feels backwards on a real device, the only lines that
// encode direction are the `crossedNext`/`crossedPrev`/`crossedLeft`/
// `crossedRight` checks below and the wheel handler.
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

/** State backing the "not interested" confirmation toast, from the moment
 * a card is dismissed until it's undone or the toast times out. */
interface PassState {
  listing: Listing;
  /** Where the card sat before removal, so Undo can put it back there. */
  atIndex: number;
  /** True once the server rejected the pass and the card was restored. */
  failed: boolean;
  reason: PassReason | null;
}

export function DiscoverReel({
  listings: initialListings,
  owners: initialOwners,
  currentUserId,
  myListings,
  initialWishlistedListingIds,
  activeSwapRequestByListingId: initialActiveSwapRequestByListingId,
  initialHasMore,
  gamification,
}: DiscoverReelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    startTime: number;
  } | null>(null);

  const [index, setIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [axis, setAxis] = useState<"x" | "y" | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [swapListing, setSwapListing] = useState<Listing | null>(null);
  const [infoDialog, setInfoDialog] = useState<InfoDialogState | null>(null);
  const [passState, setPassState] = useState<PassState | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Re-entrancy guard for goTo/commitPass, kept as a ref rather than state:
  // it never drives any rendered output, and a ref stays correct instantly
  // across every input handler's closure without forcing either callback
  // to change identity mid-transition (which would tear down/rebuild the
  // wheel + keyboard listeners while a transition was still in flight).
  const isAnimatingRef = useRef(false);

  const feed = useDiscoverFeed({
    initialListings,
    initialOwners,
    initialActiveSwapRequestByListingId,
    initialHasMore,
    currentIndex: index,
  });
  const { listings, owners, activeSwapRequestByListingId } = feed;

  const tracker = useFeedTracker({
    enabled: Boolean(currentUserId),
    activeListingId: listings[index]?.id ?? null,
    activePosition: index,
  });

  const wishlistedIds = useMemo(
    () => new Set(initialWishlistedListingIds),
    [initialWishlistedListingIds],
  );
  const anyDialogOpen = Boolean(swapListing || infoDialog);

  // Measure the viewport so a page transition can animate a card exactly
  // one screen-height (or width, for a pass) off before the next one
  // settles into place.
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
        tracker.track("swap_started", listing.id);
        router.push(`/swaps/${activeRequestId}`);
        return;
      }
      if (myListings.length === 0) {
        setInfoDialog({ type: "no-inventory", listing });
        return;
      }
      tracker.track("swap_started", listing.id);
      setSwapListing(listing);
    },
    [currentUserId, activeSwapRequestByListingId, myListings.length, router, tracker],
  );

  /** Dismisses `listing` as "not interested": records the pass (optimistic,
   * rolled back on failure), removes the card, and shows the undo toast.
   * Shared by the pass button and a committed left-swipe. */
  const performPass = useCallback(
    (listing: Listing) => {
      const result = feed.removeListing(listing.id);
      if (!result) return;
      const { index: removedIndex, remaining } = result;

      tracker.track("pass", listing.id);
      // The removed card was always the active one, so its slot is now
      // occupied by whatever came after it — advancing "for free". Only
      // clamp if that was the last card and nothing follows it.
      setIndex((prev) => (prev >= remaining ? Math.max(0, remaining - 1) : prev));
      setPassState({ listing, atIndex: removedIndex, failed: false, reason: null });

      if (currentUserId && isPersistedListingId(listing.id)) {
        recordPass(supabase, currentUserId, listing.id).catch((error) => {
          console.error("Could not save pass; restoring the card.", error);
          feed.restoreListing(listing, removedIndex);
          setIndex(removedIndex);
          setPassState({ listing, atIndex: removedIndex, failed: true, reason: null });
        });
      }
    },
    [feed, tracker, currentUserId, supabase],
  );

  /** Animates the active card off to the left, then hands off to
   * performPass once it's clear of the screen. */
  const commitPass = useCallback(
    (listing: Listing) => {
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;
      const flyDistance = (sizeRef.current.width || 400) * 1.3;
      setIsSettling(!reducedMotion);
      setDrag({ x: -flyDistance, y: 0 });

      window.setTimeout(
        () => {
          performPass(listing);
          setIsSettling(false);
          setDrag({ x: 0, y: 0 });
          setAxis(null);
          isAnimatingRef.current = false;
        },
        reducedMotion ? 0 : settleMs,
      );
    },
    [performPass, reducedMotion],
  );

  const handleUndoPass = useCallback(() => {
    if (!passState) return;
    const { listing, atIndex } = passState;
    const restoredIndex = feed.restoreListing(listing, atIndex);
    setIndex(restoredIndex);
    setPassState(null);

    if (currentUserId && isPersistedListingId(listing.id)) {
      // Fire-and-forget: if this fails, the pass row lingers server-side
      // and the listing could reappear as passed on a future fresh load.
      // Not ideal, but not worth blocking the undo's immediacy over.
      undoPass(supabase, currentUserId, listing.id).catch((error) => {
        console.error("Could not undo pass on the server.", error);
      });
    }
  }, [passState, feed, currentUserId, supabase]);

  const handlePassReason = useCallback(
    (reason: PassReason) => {
      if (!passState || !currentUserId) return;
      const { listing } = passState;
      setPassState((prev) => (prev ? { ...prev, reason } : prev));
      if (isPersistedListingId(listing.id)) {
        setPassReason(supabase, currentUserId, listing.id, reason).catch((error) => {
          console.error("Could not save pass reason.", error);
        });
      }
    },
    [passState, currentUserId, supabase],
  );

  /** A listing picked from search that isn't already loaded: fetches its
   * owner + any existing swap request, then splices it into the feed right
   * after the current card. Already-loaded results just jump the index. */
  const revealSearchResult = useCallback(
    async (listing: Listing) => {
      const existing = feed.indexOfListing(listing.id);
      if (existing !== -1) {
        setIndex(existing);
        return;
      }

      let owner: FeedOwner | null = null;
      let activeSwapRequestId: string | null = null;
      if (isPersistedListingId(listing.id)) {
        const [ownersById, activeById] = await Promise.all([
          getOwnersByListingOwnerId(supabase, [listing]),
          currentUserId
            ? findActiveSwapRequestsForListings(supabase, [listing.id], currentUserId)
            : Promise.resolve(new Map<string, string>()),
        ]);
        owner = ownersById[listing.ownerId] ?? null;
        activeSwapRequestId = activeById.get(listing.id) ?? null;
      }

      const at = feed.revealListing(listing, { owner, activeSwapRequestId }, index);
      setIndex(at);
    },
    [feed, index, supabase, currentUserId],
  );

  // Keyboard: ArrowUp/ArrowDown page, ArrowRight/Enter open the swap flow,
  // Backspace/Delete passes (mirrors the swipe gestures for anyone not
  // using touch or a mouse).
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
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const listing = listings[index];
        if (listing) commitPass(listing);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [anyDialogOpen, goTo, triggerSwapFlow, commitPass, listings, index]);

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
      const crossedLeft =
        !crossedRight &&
        (dx < -horizontalThreshold ||
          (dx < -axisLockThreshold && velocity < -flickVelocity));

      if (crossedLeft) {
        setAxis(null);
        const listing = listings[index];
        if (listing) {
          commitPass(listing);
        } else {
          setDrag({ x: 0, y: 0 });
        }
        return;
      }

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
            {passState
              ? "You've gone through everything for now — check back soon, or undo your last pass above."
              : "Check back soon, or be the first to list something for others to find."}
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
                  onPass={() => commitPass(listing)}
                  onInfoClick={() => tracker.track("info_open", listing.id)}
                />
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search listings or members"
            className="pointer-events-auto absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/50"
          >
            <Search className="h-4 w-4" />
          </button>

          <StreakXpBar
            gamification={gamification}
            index={index}
            total={listings.length}
            hasMore={feed.hasMore}
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
              disabled={index === listings.length - 1 && !feed.hasMore}
              aria-label="Next listing"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-opacity hover:bg-black/60 disabled:opacity-30"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </>
      )}

      {passState && (
        <PassToast
          key={passState.listing.id}
          listingTitle={passState.listing.title}
          failed={passState.failed}
          canGiveReason={Boolean(currentUserId) && isPersistedListingId(passState.listing.id)}
          reason={passState.reason}
          onUndo={handleUndoPass}
          onReason={handlePassReason}
          onDismiss={() => setPassState(null)}
        />
      )}

      {swapListing && currentUserId && (
        <SwapRequestDialog
          open
          onClose={() => setSwapListing(null)}
          listing={swapListing}
          myListings={myListings}
          myPointsBalance={gamification?.pointsBalance}
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
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        currentUserId={currentUserId}
        onSelectListing={(listing) => {
          void revealSearchResult(listing);
        }}
      />
    </div>
  );
}
