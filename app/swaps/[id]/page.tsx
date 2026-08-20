import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRightLeft, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSwapRequestById } from "@/lib/swap-requests";
import { getMyRatingForSwap } from "@/lib/ratings";
import { SwapStatusBadge } from "@/components/swap-status-badge";
import { SwapActions } from "@/components/swap-actions";
import { ChatThread } from "@/components/chat-thread";
import { RatingPanel } from "@/components/rating-panel";
import type { Listing } from "@/types";

interface SwapDetailPageProps {
  params: { id: string };
}

export default async function SwapDetailPage({ params }: SwapDetailPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const swapRequest = await getSwapRequestById(supabase, params.id);

  if (!swapRequest) {
    notFound();
  }

  if (swapRequest.senderId !== user.id && swapRequest.receiverId !== user.id) {
    redirect("/swaps");
  }

  const role: "sender" | "receiver" = swapRequest.senderId === user.id ? "sender" : "receiver";
  const otherProfile = role === "sender" ? swapRequest.receiver : swapRequest.sender;
  const otherUserId = role === "sender" ? swapRequest.receiverId : swapRequest.senderId;

  const myRating = swapRequest.status === "completed" ? await getMyRatingForSwap(supabase, swapRequest.id, user.id) : null;

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Swap request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            With {otherProfile?.fullName || otherProfile?.username || "another swapper"}
          </p>
        </div>
        <SwapStatusBadge status={swapRequest.status} />
      </div>

      {/* Item comparison */}
      <div className="mb-8 grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <ItemSummary label={role === "sender" ? "You offered" : "They offered"} listing={swapRequest.offeredListing} />
        <ArrowRightLeft className="mx-auto h-5 w-5 text-muted-foreground" />
        <ItemSummary label={role === "sender" ? "For their" : "For your"} listing={swapRequest.listing} />
      </div>

      {/* Actions */}
      <div className="mb-8">
        <SwapActions swapRequest={swapRequest} role={role} currentUserId={user.id} />
      </div>

      {/* Rating (only once completed) */}
      {swapRequest.status === "completed" && otherProfile && (
        <div className="mb-8">
          <RatingPanel
            swapRequestId={swapRequest.id}
            authorId={user.id}
            subject={otherProfile}
            existingRating={myRating}
          />
        </div>
      )}

      {/* Chat */}
      {swapRequest.conversationId && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Messages</h2>
          <ChatThread
            conversationId={swapRequest.conversationId}
            currentUserId={user.id}
            otherUserId={otherUserId}
            otherUserName={otherProfile?.fullName || otherProfile?.username || "them"}
          />
        </div>
      )}
    </div>
  );
}

function ItemSummary({ label, listing }: { label: string; listing: Listing | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {listing?.imageUrl ? (
          <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {listing ? (
          <Link href={`/listings/${listing.id}`} className="truncate text-sm font-medium hover:underline">
            {listing.title}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Item unavailable</p>
        )}
      </div>
    </div>
  );
}
