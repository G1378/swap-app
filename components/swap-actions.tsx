"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageSquareDiff, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  cancelSwapRequest,
  markSwapSideComplete,
  respondToSwapRequest,
} from "@/lib/swap-requests";
import { Button } from "@/components/ui/button";
import { CounterOfferDialog } from "@/components/counter-offer-dialog";
import { MatchCelebration } from "@/components/match-celebration";
import type { Listing, SwapRequestWithDetails } from "@/types";

interface SwapActionsProps {
  swapRequest: SwapRequestWithDetails;
  role: "sender" | "receiver";
  currentUserId: string;
  /** The current viewer's own available listings, needed if they want to
   * counter (they pick from their own items, same as the original offer). */
  myListings: Listing[];
}

export function SwapActions({
  swapRequest,
  role,
  currentUserId,
  myListings,
}: SwapActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  // Only ever set true right after a successful accept — see the "accept"
  // action below. Deliberately local/in-memory rather than tracked in the
  // database: it's a one-time celebratory moment for whoever just clicked
  // Accept, not a "has either party seen this yet" flag, so there's no
  // state to persist or a migration to add for it.
  const [showCelebration, setShowCelebration] = useState(false);

  async function run(action: string, fn: () => Promise<void>) {
    setLoading(action);
    setError(null);
    try {
      await fn();
      if (action === "accept") setShowCelebration(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(null);
    }
  }

  const myCompletedAt =
    role === "sender"
      ? swapRequest.senderCompletedAt
      : swapRequest.receiverCompletedAt;
  const otherCompletedAt =
    role === "sender"
      ? swapRequest.receiverCompletedAt
      : swapRequest.senderCompletedAt;

  if (swapRequest.status === "countered") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {role === "receiver"
            ? "You proposed new terms for this swap."
            : "They proposed new terms for this swap."}
        </p>
        {swapRequest.counteredByRequestId && (
          <Link href={`/swaps/${swapRequest.counteredByRequestId}`}>
            <Button size="sm" variant="outline" className="gap-2">
              View the counter-offer
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {swapRequest.status === "pending" && role === "receiver" && (
          <>
            <Button
              className="gap-2"
              disabled={loading !== null}
              onClick={() =>
                run("accept", () =>
                  respondToSwapRequest(supabase, swapRequest.id, "accepted"),
                )
              }
            >
              {loading === "accept" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accept
            </Button>
            {myListings.length > 0 && (
              <Button
                variant="outline"
                className="gap-2"
                disabled={loading !== null}
                onClick={() => setCounterOpen(true)}
              >
                <MessageSquareDiff className="h-4 w-4" />
                Counter offer
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              disabled={loading !== null}
              onClick={() =>
                run("decline", () =>
                  respondToSwapRequest(supabase, swapRequest.id, "declined"),
                )
              }
            >
              {loading === "decline" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Decline
            </Button>
          </>
        )}

        {(swapRequest.status === "pending" ||
          swapRequest.status === "accepted") && (
          <Button
            variant="outline"
            className="gap-2"
            disabled={loading !== null}
            onClick={() =>
              run("cancel", () => cancelSwapRequest(supabase, swapRequest.id))
            }
          >
            {loading === "cancel" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Cancel swap
          </Button>
        )}

        {swapRequest.status === "accepted" && !myCompletedAt && (
          <Button
            className="gap-2"
            disabled={loading !== null}
            onClick={() =>
              run("complete", () =>
                markSwapSideComplete(supabase, swapRequest.id, role),
              )
            }
          >
            {loading === "complete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Mark my side complete
          </Button>
        )}
      </div>

      {swapRequest.status === "accepted" &&
        myCompletedAt &&
        !otherCompletedAt && (
          <p className="text-sm text-muted-foreground">
            You've confirmed your side. Waiting on the other person to confirm
            theirs.
          </p>
        )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {swapRequest.status === "pending" && role === "receiver" && (
        <CounterOfferDialog
          open={counterOpen}
          onClose={() => setCounterOpen(false)}
          parentRequest={swapRequest}
          currentUserId={currentUserId}
          myListings={myListings}
        />
      )}

      {/* Only the receiver has an Accept button above, so this only ever
          fires for them — the sender will see the updated "accepted"
          status next time they load the page. Extending this to greet
          the sender too would need a persisted "seen" flag, which felt
          like more state than a single celebratory moment justified. */}
      {role === "receiver" && (
        <MatchCelebration
          open={showCelebration}
          onClose={() => setShowCelebration(false)}
          you={{
            name: "You",
            avatarUrl: swapRequest.receiver?.avatarUrl ?? null,
            itemTitle: swapRequest.listing?.title ?? "your item",
          }}
          others={[
            {
              name:
                swapRequest.sender?.fullName ||
                swapRequest.sender?.username ||
                "the other trader",
              avatarUrl: swapRequest.sender?.avatarUrl ?? null,
              itemTitle:
                swapRequest.offeredListings.map((l) => l.title).join(", ") ||
                "their item",
            },
          ]}
          messagesAnchorId="messages"
        />
      )}
    </div>
  );
}
