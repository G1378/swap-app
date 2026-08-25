import Image from "next/image";
import { Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types";

interface OfferBuilderProps {
  myListings: Listing[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  cashDollars: string;
  onCashChange: (value: string) => void;
  itemsLabel?: string;
}

/** Multi-select item grid + optional cash amount, shared by the initial
 * swap request dialog and the counter-offer dialog — both are really the
 * same "build an offer" interaction. */
export function OfferBuilder({
  myListings,
  selectedIds,
  onToggle,
  cashDollars,
  onCashChange,
  itemsLabel = "Your items to offer",
}: OfferBuilderProps) {
  return (
    <div className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="cash-topup">Add cash (optional)</Label>
        <div className="relative max-w-[10rem]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="cash-topup"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            className="pl-6"
            value={cashDollars}
            onChange={(e) => onCashChange(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Sweeten your offer if your item's a bit lower value.</p>
      </div>
    </div>
  );
}
