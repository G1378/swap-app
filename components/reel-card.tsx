"use client";

import Image from "next/image";
import Link from "next/link";
import { Handshake, Info, Package, Repeat2, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { WishlistButton } from "@/components/wishlist-button";
import { REEL_GESTURE } from "@/lib/constants";
import { MATCH_SCORE_THRESHOLD } from "@/lib/feed/constants";
import type { DiscoverListing, Profile } from "@/types";

interface ReelCardProps {
  listing: DiscoverListing;
  owner: Pick<Profile, "username" | "fullName" | "avatarUrl"> | null;
  /** True only for the centered/current card — prev/next staging cards
   * render statically and never receive drag or a swipe-hint. */
  isActive: boolean;
  /** Hints next/image to load this card's photo eagerly. Passed for
   * whichever card is currently active, since it's the primary visible
   * content the moment it becomes so. */
  priority: boolean;
  /** Live horizontal drag offset in px, 0 unless this is the active card
   * mid-drag. Drives the right-drag "swap" tint and the left-drag "not
   * interested" tint and stamp, both of which fade in as the drag nears
   * the commit threshold. */
  dragX: number;
  currentUserId: string | null;
  wishlisted: boolean;
  onOpenSwapFlow: () => void;
  /** Dismisses this card as "not interested" — the button equivalent of
   * swiping left, for anyone not using a touch gesture. */
  onPass: () => void;
  /** Called when the full-details link is followed, for tracking. */
  onInfoClick?: () => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(value, 1));
}

export function ReelCard({
  listing,
  owner,
  isActive,
  priority,
  dragX,
  currentUserId,
  wishlisted,
  onOpenSwapFlow,
  onPass,
  onInfoClick,
}: ReelCardProps) {
  const rightProgress = isActive ? clamp01(dragX / REEL_GESTURE.horizontalThreshold) : 0;
  const leftProgress = isActive ? clamp01(-dragX / REEL_GESTURE.horizontalThreshold) : 0;
  const ownerName = owner ? owner.fullName || owner.username : null;
  const isGoodSwapOdds = listing.acceptScore >= MATCH_SCORE_THRESHOLD;
  const isWantMatch = listing.wantScore >= MATCH_SCORE_THRESHOLD;

  return (
    <div
      role="group"
      aria-label={`${listing.title}, ${listing.category}${listing.wantedInReturn ? `, wants ${listing.wantedInReturn}` : ""}`}
      aria-hidden={!isActive}
      inert={!isActive}
      className="relative h-full w-full overflow-hidden bg-neutral-900"
    >
      {listing.imageUrl ? (
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          fill
          priority={priority}
          sizes="100vw"
          draggable={false}
          className="select-none object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package className="h-16 w-16 text-white/30" />
        </div>
      )}

      {/* Legibility gradient behind the bottom text block */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {/* Fades in as the active card is dragged toward the swap threshold */}
      {rightProgress > 0 && (
        <div className="pointer-events-none absolute inset-0 bg-primary" style={{ opacity: rightProgress * 0.25 }} />
      )}

      {/* Fades in as the active card is dragged toward the pass threshold.
          Dark rather than colored: passing is a quiet "no", not an alarm. */}
      {leftProgress > 0 && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: leftProgress * 0.4 }} />
          {leftProgress > 0.15 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ opacity: clamp01(leftProgress * 1.2) }}
            >
              <span className="flex items-center gap-2 rounded-full border-2 border-white/80 bg-black/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
                <X className="h-4 w-4" />
                Not interested
              </span>
            </div>
          )}
        </>
      )}

      <div className="absolute left-4 top-4 flex flex-wrap items-center gap-1.5 pr-20">
        <Badge>{listing.category}</Badge>
        {/* Match badges come from get_discover_feed's text-matching scores
           (see prisma/migrations_manual/0015) — lexical, not semantic, so
           they catch close title matches, not synonyms. Both can show at
           once; accept (they'd likely take one of your items) matters more
           than want (this looks like something you're after), so it's
           listed first. */}
        {isGoodSwapOdds && (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Handshake className="h-3 w-3" />
            Good swap odds
          </span>
        )}
        {isWantMatch && (
          <span className="flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Matches what you want
          </span>
        )}
      </div>

      {/* Right action rail */}
      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onPass}
          aria-label="Not interested"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <X className="h-5 w-5" />
        </button>
        <WishlistButton
          listingId={listing.id}
          userId={currentUserId}
          initialSaved={wishlisted}
          className="h-11 w-11 bg-black/40 hover:bg-black/60"
        />
        <Link
          href={`/listings/${listing.id}`}
          onClick={onInfoClick}
          aria-label="View full details"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-colors hover:bg-black/60"
        >
          <Info className="h-5 w-5" />
        </Link>
        <button
          type="button"
          onClick={onOpenSwapFlow}
          aria-label="Request a swap"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <Repeat2 className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom content block */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 pr-20">
        {owner && ownerName && (
          <Link
            href={`/profile/${owner.username}`}
            className="flex w-fit items-center gap-2 text-sm font-medium text-white/90 hover:underline"
          >
            <Avatar src={owner.avatarUrl} alt={ownerName} fallback={ownerName} size={24} />
            {ownerName}
          </Link>
        )}
        <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">{listing.title}</h2>
        <p className="line-clamp-2 text-sm text-white/80">{listing.description}</p>
        {listing.wantedInReturn && <p className="text-sm font-medium text-white/90">Wants: {listing.wantedInReturn}</p>}
        <p className="mt-1 text-xs text-white/50">Swipe right to swap, left if not interested</p>
      </div>
    </div>
  );
}
