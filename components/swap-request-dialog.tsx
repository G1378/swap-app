"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createSwapRequest } from "@/lib/swap-requests";
import { bestMatchingListingId } from "@/lib/feed/text-similarity";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OfferBuilder } from "@/components/offer-builder";
import { PointsInput } from "@/components/points-input";
import type { Listing } from "@/types";

interface SwapRequestDialogProps {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  myListings: Listing[];
  /** The current user's spendable points balance, for the optional
   * top-up field. Omit (or pass 0) if it isn't known — the field still
   * renders, just without a visible ceiling. */
  myPointsBalance?: number;
}

/** Whichever of the user's own listings best matches what `listing`'s
 * owner said they want, falling back to the first listing (the prior
 * behaviour) if nothing clears the match threshold or there's nothing to
 * compare against. Computed once, not live — see the note on `useState`
 * below for why that's the right call here. */
function initialSelection(listing: Listing, myListings: Listing[]): string[] {
  const bestId = bestMatchingListingId(listing.wantedInReturn, myListings);
  const fallbackId = myListings[0]?.id;
  const id = bestId ?? fallbackId;
  return id ? [id] : [];
}

export function SwapRequestDialog({ open, onClose, listing, myListings, myPointsBalance }: SwapRequestDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  // A lazy useState initializer, not useMemo: this only needs to run once,
  // the first time this dialog appears for this `listing`. Both call sites
  // already guarantee that — components/discover-reel.tsx only mounts this
  // dialog while a listing is selected (unmounting/remounting it fresh
  // each time), and components/listing-swap-action.tsx renders one dialog
  // per fixed listing for the page's lifetime.
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialSelection(listing, myListings));
  const [offeredPoints, setOfferedPoints] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError("Choose at least one of your items to offer.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const swapRequestId = await createSwapRequest(supabase, {
        receiverId: listing.ownerId,
        requestedListingIds: [listing.id],
        offeredListingIds: selectedIds,
        offeredPoints,
        note,
      });
      router.push(`/swaps/${swapRequestId}`);
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
      title={`Request a swap for "${listing.title}"`}
      description="Pick one or more of your own items to offer in return."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <OfferBuilder listings={myListings} selectedIds={selectedIds} onToggle={toggleSelected} />

        <PointsInput
          id="offered-points"
          label="Add points to your offer"
          value={offeredPoints}
          onChange={setOfferedPoints}
          maxAvailable={myPointsBalance}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Message (optional)</Label>
          <Textarea
            id="note"
            placeholder="Say hi to the owner and explain why your offer's a good match..."
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
          <Button type="submit" disabled={loading || selectedIds.length === 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send swap request
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
