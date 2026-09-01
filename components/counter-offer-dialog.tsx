"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCounterOffer } from "@/lib/swap-requests";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OfferBuilder } from "@/components/offer-builder";
import type { Listing, SwapRequestWithDetails } from "@/types";

interface CounterOfferDialogProps {
  open: boolean;
  onClose: () => void;
  parentRequest: SwapRequestWithDetails;
  currentUserId: string;
  /** The countering party's own available listings to pick from. */
  myListings: Listing[];
}

export function CounterOfferDialog({
  open,
  onClose,
  parentRequest,
  currentUserId,
  myListings,
}: CounterOfferDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedIds, setSelectedIds] = useState<string[]>(myListings[0] ? [myListings[0].id] : []);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherPartyId =
    currentUserId === parentRequest.senderId ? parentRequest.receiverId : parentRequest.senderId;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError("Choose at least one item to offer.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const counter = await createCounterOffer(supabase, {
        parentRequestId: parentRequest.id,
        listingId: parentRequest.listingId,
        senderId: currentUserId,
        receiverId: otherPartyId,
        offeredListingIds: selectedIds,
        note,
      });
      router.push(`/swaps/${counter.id}`);
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
      title="Propose a counter-offer"
      description="Choose what you'd offer instead — this replaces the current offer and keeps your chat history."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <OfferBuilder
          myListings={myListings}
          selectedIds={selectedIds}
          onToggle={toggleSelected}
          itemsLabel="Your items to offer instead"
        />

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
          <Button type="submit" disabled={loading || selectedIds.length === 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send counter-offer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
