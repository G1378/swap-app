import { ArrowRightLeft, Banknote } from "lucide-react";
import { findCategoryPath, getTopLevelCategory } from "@/lib/data/categories";
import { getCategoryVisual } from "@/lib/data/categoryIcons";
import { ITEM_CONDITIONS } from "@/lib/data/conditions";
import type { Listing } from "@/types/listing";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const categoryEntry = findCategoryPath(listing.categoryId);
  const topCategory = getTopLevelCategory(listing.categoryId);
  const { icon: CategoryIcon, tint } = getCategoryVisual(topCategory?.id);
  const conditionLabel = ITEM_CONDITIONS.find((c) => c.value === listing.condition)?.label;
  const wanted = listing.wantedInReturn.slice(0, 2).join(", ");
  const extraWanted = listing.wantedInReturn.length - 2;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className={`relative flex aspect-square items-center justify-center ${tint}`}>
        <CategoryIcon className="h-9 w-9" strokeWidth={1.5} aria-hidden />
        {conditionLabel && (
          <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-ink">
            {conditionLabel}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink">
          {listing.title}
        </h3>
        <p className="text-xs text-ink-soft">
          {listing.brand ? `${listing.brand} \u00b7 ` : ""}
          {categoryEntry?.category.name ?? "Uncategorised"}
        </p>
        {wanted && (
          <p className="mt-1 line-clamp-1 text-xs text-ink-soft">
            <span className="font-medium text-ink">Wants:</span> {wanted}
            {extraWanted > 0 ? ` +${extraWanted}` : ""}
          </p>
        )}
        <div className="mt-auto flex items-center gap-1 pt-2 text-xs text-ink-soft">
          {listing.cashPreference === "top-up-ok" ? (
            <>
              <Banknote className="h-3.5 w-3.5" aria-hidden />
              Open to a top-up
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
              Swap only
            </>
          )}
        </div>
      </div>
    </article>
  );
}
