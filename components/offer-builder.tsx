import Image from "next/image";
import { Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types";

interface OfferBuilderProps {
  /** The listings to choose from — the current user's own catalog when
   * building what they're offering, or the other party's catalog when
   * choosing what to ask for. */
  listings: Listing[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  itemsLabel?: string;
  /** Shown under the label; defaults to a note about bundling. */
  helperText?: string;
}

/** Multi-select item grid, shared by the swap request dialog and the
 * counter-offer dialog for both "what you're offering" and "what you're
 * requesting" panels — all four are really the same "build a bundle"
 * interaction. Swap-app is a pure item-for-item marketplace: bundles are
 * always one or more listings; points (handled separately, see
 * PointsInput) are an optional top-up, never a substitute for an item. */
export function OfferBuilder({
  listings,
  selectedIds,
  onToggle,
  itemsLabel = "Items to offer",
  helperText = "Select one or more — bundle a few items to sweeten the deal.",
}: OfferBuilderProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{itemsLabel}</Label>
      <p className="text-xs text-muted-foreground">{helperText}</p>
      {listings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No available items to choose from here.
        </p>
      ) : (
        <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {listings.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onToggle(item.id)}
                aria-pressed={selected}
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
      )}
    </div>
  );
}
