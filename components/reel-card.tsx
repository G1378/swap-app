"use client";

import Image from "next/image";
import Link from "next/link";
import { Info, Package, Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { WishlistButton } from "@/components/wishlist-button";
import { REEL_GESTURE } from "@/lib/constants";
import type { Listing, Profile } from "@/types";

interface ReelCardProps {
  listing: Listing;
  owner: Pick<Profile, "username" | "fullName" | "avatarUrl"> | null;
  /** True only for the centered/current card — prev/next staging cards
   * render statically and never receive drag or a swipe-hint. */
  isActive: boolean;
  /** Hints next/image to load this card's photo eagerly. Passed for
   * whichever card is currently active, since it's the primary visible
   * content the moment it becomes so. */
  priority: boolean;
  /** Live horizontal drag offset in px, 0 unless this is the active card
   * mid-drag. Only used to fade in the "accept" tint as the user drags
   * right past the threshold. */
  dragX: number;
  currentUserId: string | null;
  wishlisted: boolean;
  onOpenSwapFlow: () => void;
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
}: ReelCardProps) {
  const rightProgress = isActive ? Math.max(0, Math.min(dragX / REEL_GESTURE.horizontalThreshold, 1)) : 0;
  const ownerName = owner ? owner.fullName || owner.username : null;

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

      <div className="absolute left-4 top-4">
        <Badge>{listing.category}</Badge>
      </div>

      {/* Right action rail */}
      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-4">
        <WishlistButton
          listingId={listing.id}
          userId={currentUserId}
          initialSaved={wishlisted}
          className="h-11 w-11 bg-black/40 hover:bg-black/60"
        />
        <Link
          href={`/listings/${listing.id}`}
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
        <p className="mt-1 text-xs text-white/50">Swipe right to start a swap →</p>
      </div>
    </div>
  );
}
