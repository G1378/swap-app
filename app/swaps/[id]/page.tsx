import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { mapListingRow } from "@/lib/mappers";
import { getSwapRequestById } from "@/lib/swap-requests";
import { getMyRatingForSwap } from "@/lib/ratings";
import {
  bumpQuestProgress,
  claimSwapCompletionReward,
  getGamificationProfilesByProfileIds,
} from "@/lib/gamification/queries";
import { SwapStatusBadge } from "@/components/swap-status-badge";
import { SwapActions } from "@/components/swap-actions";
import { ChatThread } from "@/components/chat-thread";
import { RatingPanel } from "@/components/rating-panel";
import { OfferedBundleSummary } from "@/components/offered-bundle-summary";
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

  const role: "sender" | "receiver" =
    swapRequest.senderId === user.id ? "sender" : "receiver";
  const otherProfile =
    role === "sender" ? swapRequest.receiver : swapRequest.sender;
  const otherUserId =
    role === "sender" ? swapRequest.receiverId : swapRequest.senderId;

  // Best-effort: awards this viewer's share of the swap-completion XP/points
  // the first time they see it completed. Idempotent server-side, so it's
  // safe to call on every view rather than only the exact moment it flips.
  if (swapRequest.status === "completed") {
    await claimSwapCompletionReward(supabase, swapRequest.id);
    await bumpQuestProgress(supabase, "complete-a-swap");
  }

  const [myRating, { data: myListingRows }, { data: otherListingRows }, pointsByProfileId] = await Promise.all([
    swapRequest.status === "completed"
      ? getMyRatingForSwap(supabase, swapRequest.id, user.id)
      : Promise.resolve(null),
    supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .eq("status", "available")
      .order("created_at", { ascending: false }),
    // Only needed while there's still something to negotiate — no point
    // fetching the other party's whole catalog once the swap is settled.
    swapRequest.status === "pending"
      ? supabase
          .from("listings")
          .select("*")
          .eq("owner_id", otherUserId)
          .eq("status", "available")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    getGamificationProfilesByProfileIds(supabase, [user.id, otherUserId]),
  ]);

  const myListings: Listing[] = (myListingRows ?? []).map(mapListingRow);
  const otherPartyListings: Listing[] = (otherListingRows ?? []).map(mapListingRow);
  const myPointsBalance = pointsByProfileId.get(user.id)?.pointsBalance ?? 0;
  const otherPartyPointsBalance = pointsByProfileId.get(otherUserId)?.pointsBalance ?? 0;
  const otherDisplayName =
    otherProfile?.fullName || otherProfile?.username || "another swapper";

  // Which bundle/points belong to "you" vs "them" depends on which role
  // you played in this particular round — the sender always owns
  // offeredListings/offeredPoints, the receiver's side is always
  // requestedListings/requestedPoints.
  const yourBundle = role === "sender"
    ? { listings: swapRequest.offeredListings, points: swapRequest.offeredPoints }
    : { listings: swapRequest.requestedListings, points: swapRequest.requestedPoints };
  const theirBundle = role === "sender"
    ? { listings: swapRequest.requestedListings, points: swapRequest.requestedPoints }
    : { listings: swapRequest.offeredListings, points: swapRequest.offeredPoints };

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Swap request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            With{" "}
            {otherProfile ? (
              <Link
                href={`/profile/${otherProfile.username}`}
                className="font-medium text-foreground hover:underline"
              >
                {otherDisplayName}
              </Link>
            ) : (
              otherDisplayName
            )}
          </p>
        </div>
        <SwapStatusBadge status={swapRequest.status} />
      </div>

      {swapRequest.parentRequestId && (
        <Link
          href={`/swaps/${swapRequest.parentRequestId}`}
          className="mb-6 block text-sm text-muted-foreground hover:underline"
        >
          ← This is a counter-offer. View the original offer.
        </Link>
      )}

      {/* Item comparison */}
      <div className="mb-8 grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <OfferedBundleSummary label="You offered" listings={yourBundle.listings} points={yourBundle.points} />
        <ArrowRightLeft className="mx-auto mt-4 h-5 w-5 shrink-0 text-muted-foreground" />
        <OfferedBundleSummary label="In exchange for" listings={theirBundle.listings} points={theirBundle.points} />
      </div>

      {/* Actions */}
      <div className="mb-8">
        <SwapActions
          swapRequest={swapRequest}
          role={role}
          currentUserId={user.id}
          myListings={myListings}
          otherPartyListings={otherPartyListings}
          myPointsBalance={myPointsBalance}
          otherPartyPointsBalance={otherPartyPointsBalance}
        />
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
        <div id="messages">
          <h2 className="mb-3 text-lg font-semibold">Messages</h2>
          <ChatThread
            conversationId={swapRequest.conversationId}
            currentUserId={user.id}
            otherUserId={otherUserId}
            otherUserName={otherDisplayName}
          />
        </div>
      )}
    </div>
  );
}
