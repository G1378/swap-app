"use client";

import { useState } from "react";
import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SwapRequestDialog } from "@/components/swap-request-dialog";
import type { Listing } from "@/types";

interface ListingSwapActionProps {
  listing: Listing;
  currentUserId: string | null;
  myListings: Listing[];
}

export function ListingSwapAction({ listing, currentUserId, myListings }: ListingSwapActionProps) {
  const [open, setOpen] = useState(false);

  if (!currentUserId) {
    return (
      <Link href="/login">
        <Button className="gap-2">
          <Repeat2 className="h-4 w-4" />
          Log in to request a swap
        </Button>
      </Link>
    );
  }

  if (listing.status !== "available") {
    return (
      <Button disabled className="gap-2">
        <Repeat2 className="h-4 w-4" />
        {listing.status === "pending" ? "Swap already in progress" : "Already swapped"}
      </Button>
    );
  }

  if (myListings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        List an available item of your own before requesting a swap.{" "}
        <Link href="/listings/new" className="font-medium text-primary hover:underline">
          Create a listing
        </Link>
      </div>
    );
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Repeat2 className="h-4 w-4" />
        Request swap
      </Button>
      <SwapRequestDialog
        open={open}
        onClose={() => setOpen(false)}
        listing={listing}
        senderId={currentUserId}
        myListings={myListings}
      />
    </>
  );
}
