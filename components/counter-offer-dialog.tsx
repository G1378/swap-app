"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCounterOffer } from "@/lib/swap-requests";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OfferBuilder } from "@/components/offer-builder";
import { PointsInput } from "@/components/points-input";
import type { Listing, SwapRequestWithDetails } from "@/types";

interface CounterOfferDialogProps {
  open: boolean;
  onClose: () => void;
  parentRequest: SwapRequestWithDetails;
  currentUserId: string;
  /** The current user's own available listings — what they can choose
   * from to offer. */
  myListings: Listing[];
  /** The other participant's available listings — what the current user
   * can choose from to request. This is what makes a counter able to ask
   * for multiple specific items, not just re-offer from your own side. */
  otherPartyListings: Listing[];
  myPointsBalance?: number;
  otherPartyPointsBalance?: number;
}

export function CounterOfferDialog({
  open,
  onClose,
  parentRequest,
  currentUserId,
  myListings,
  otherPartyListings,
  myPointsBalance,
  otherPartyPointsBalance,
}: CounterOfferDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  const otherPartyId =
    currentUserId === parentRequest.senderId ? parentRequest.receiverId : parentRequest.senderId;

  // Pre-select whatever's already "on the table" for each side, so
  // revising an offer doesn't mean starting from a blank grid. Both
  // bundles on the parent request get checked by ownership: whichever of
  // those listings belong to you seed "what you're offering", whichever
  // belong to the other party seed "what you're requesting" — this works
  // the same way whether you're the original sender revising your own
  // offer, or the receiver countering for the first time.
  const myListingIds = new Set(myListings.map((l) => l.id));
  const otherListingIds = new Set(otherPartyListings.map((l) => l.id));
  const combinedParentListings = [...parentRequest.offeredListings, ...parentRequest.requestedListings];

  const [selectedOfferedIds, setSelectedOfferedIds] = useState<string[]>(
    combinedParentListings.filter((l) => l.ownerId === currentUserId && myListingIds.has(l.id)).map((l) => l.id)
  );
  const [selectedRequestedIds, setSelectedRequestedIds] = useState<string[]>(
    combinedParentListings.filter((l) => l.ownerId === otherPartyId && otherListingIds.has(l.id)).map((l) => l.id)
  );
  const [offeredPoints, setOfferedPoints] = useState(0);
  const [requestedPoints, setRequestedPoints] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOffered(id: string) {
    setSelectedOfferedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  }

  function toggleRequested(id: string) {
    setSelectedRequestedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedOfferedIds.length === 0) {
      setError("Choose at least one item to offer.");
      return;
    }
    if (selectedRequestedIds.length === 0) {
      setError("Choose at least one item to request.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const counterId = await createCounterOffer(supabase, {
        parentRequestId: parentRequest.id,
        requestedListingIds: selectedRequestedIds,
        offeredListingIds: selectedOfferedIds,
        offeredPoints,
        requestedPoints,
        note,
      });
      router.push(`/swaps/${counterId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Propose new terms"
      description="Change what you're offering, what you're asking for, or both — this replaces the current terms and keeps your chat history."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-3">
          <div className="flex flex-col gap-3">
            <OfferBuilder
              listings={myListings}
              selectedIds={selectedOfferedIds}
              onToggle={toggleOffered}
              itemsLabel="What you're offering"
            />
            <PointsInput
              id="counter-offered-points"
              label="Add points to your offer"
              value={offeredPoints}
              onChange={setOfferedPoints}
              maxAvailable={myPointsBalance}
            />
          </div>

          <ArrowRightLeft className="mx-auto mt-8 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />

          <div className="flex flex-col gap-3">
            <OfferBuilder
              listings={otherPartyListings}
              selectedIds={selectedRequestedIds}
              onToggle={toggleRequested}
              itemsLabel="What you're requesting"
              helperText="Pick one or more of their items — a counter can ask for more than the original offer."
            />
            <PointsInput
              id="counter-requested-points"
              label="Ask them to add points"
              value={requestedPoints}
              onChange={setRequestedPoints}
              maxAvailable={otherPartyPointsBalance}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="counter-note">Message (optional)</Label>
          <Textarea
            id="counter-note"
            placeholder="Explain your counter-offer..."
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || selectedOfferedIds.length === 0 || selectedRequestedIds.length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send new terms
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
