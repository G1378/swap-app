import Image from "next/image";
import { Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types";

interface OfferBuilderProps {
  myListings: Listing[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  itemsLabel?: string;
}

/** Multi-select item grid, shared by the initial swap request dialog and
 * the counter-offer dialog — both are really the same "build an offer"
 * interaction. Swap-app is a pure item-for-item marketplace: offers are
 * always one or more listings, never cash. */
export function OfferBuilder({
  myListings,
  selectedIds,
  onToggle,
  itemsLabel = "Your items to offer",
}: OfferBuilderProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{itemsLabel}</Label>
      <p className="text-xs text-muted-foreground">Select one or more — bundle a few items to sweeten the deal.</p>
      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {myListings.map((item) => {
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
    </div>
  );
}
