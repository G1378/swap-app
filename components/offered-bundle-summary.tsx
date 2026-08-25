import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";
import type { Listing } from "@/types";

interface OfferedBundleSummaryProps {
  label: string;
  listings: Listing[];
  cashOfferCents: number;
}

/** Renders one side of a swap comparison — one or more offered listings
 * plus an optional cash top-up. Used for both the (possibly multi-item)
 * offered bundle and the single requested listing on the swap detail page. */
export function OfferedBundleSummary({ label, listings, cashOfferCents }: OfferedBundleSummaryProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>

      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Item unavailable</p>
      ) : (
        <div className="flex flex-col gap-2">
          {listings.map((item) => (
            <Link key={item.id} href={`/listings/${item.id}`} className="flex items-center gap-2 hover:underline">
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Package className="h-4 w-4" />
                  </div>
                )}
              </div>
              <span className="truncate text-sm font-medium">{item.title}</span>
            </Link>
          ))}
        </div>
      )}

      {cashOfferCents > 0 && (
        <Badge variant="accent" className="w-fit">
          + {formatCents(cashOfferCents)} cash
        </Badge>
      )}
    </div>
  );
}
