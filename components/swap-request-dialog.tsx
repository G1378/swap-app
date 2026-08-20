"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createSwapRequest } from "@/lib/swap-requests";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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

  const [offeredListingId, setOfferedListingId] = useState<string>(myListings[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offeredListingId) {
      setError("Choose one of your items to offer.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const swapRequest = await createSwapRequest(supabase, {
        listingId: listing.id,
        senderId,
        receiverId: listing.ownerId,
        offeredListingId,
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
      description="Pick one of your own items to offer in return."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Your item to offer</Label>
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {myListings.map((item) => {
              const selected = item.id === offeredListingId;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setOfferedListingId(item.id)}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-lg border text-left transition-colors",
                    selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="relative aspect-square w-full bg-muted">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <span className="line-clamp-2 p-1.5 text-xs font-medium">{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Message (optional)</Label>
          <Textarea
            id="note"
            placeholder={`Say hi to the owner and explain why your item's a good match...`}
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
          <Button type="submit" disabled={loading || !offeredListingId}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send swap request
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
