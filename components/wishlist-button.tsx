"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addToWishlist, removeFromWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  listingId: string;
  userId: string | null;
  initialSaved: boolean;
  className?: string;
}

export function WishlistButton({ listingId, userId, initialSaved, className }: WishlistButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  if (!userId) return null;

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const next = !saved;
    setSaved(next); // optimistic

    startTransition(async () => {
      try {
        if (next) {
          await addToWishlist(supabase, userId as string, listingId);
        } else {
          await removeFromWishlist(supabase, userId as string, listingId);
        }
      } catch {
        setSaved(!next); // revert on failure
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur transition-colors hover:bg-background disabled:opacity-60",
        className
      )}
    >
      <Heart
        className={cn("h-4 w-4 transition-colors", saved ? "fill-destructive text-destructive" : "text-muted-foreground")}
      />
    </button>
  );
}
