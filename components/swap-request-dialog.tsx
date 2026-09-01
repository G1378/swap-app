"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createSwapRequest } from "@/lib/swap-requests";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OfferBuilder } from "@/components/offer-builder";
import type { Listing } from "@/types";

interface SwapRequestDialogProps {
  open: boolean;
  onClose: () => void;
  listing: Listing;
  senderId: string;
  myListings: Listing[];
}

export function SwapRequestDialog({ open, onClose, listing, senderId, myListings }: SwapRequestDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedIds, setSelectedIds] = useState<string[]>(myListings[0] ? [myListings[0].id] : []);
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
      const swapRequest = await createSwapRequest(supabase, {
        listingId: listing.id,
        senderId,
        receiverId: listing.ownerId,
        offeredListingIds: selectedIds,
        note,
      });
      router.push(`/swaps/${swapRequest.id}`);
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
        <OfferBuilder myListings={myListings} selectedIds={selectedIds} onToggle={toggleSelected} />

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
