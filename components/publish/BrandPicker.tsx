"use client";

import * as React from "react";
import { ChevronRight, Search } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { getBrandsForCategory, searchBrands } from "@/lib/data/brands";
import type { Brand } from "@/types/taxonomy";
import { cn } from "@/lib/utils";

interface BrandPickerProps {
  id?: string;
  value: string | null;
  onChange: (brandName: string | null) => void;
  /** Top-level category id, used to prioritise and filter the brand list. */
  categoryTopId?: string | null;
}

export function BrandPicker({ id, value, onChange, categoryTopId }: BrandPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const trimmedQuery = query.trim();
  const popular = React.useMemo(
    () => getBrandsForCategory(categoryTopId ?? undefined).filter((b) => b.popular),
    [categoryTopId]
  );
  const alphabetical = React.useMemo(
    () => searchBrands("", categoryTopId ?? undefined),
    [categoryTopId]
  );
  const searchResults = trimmedQuery
    ? searchBrands(trimmedQuery, categoryTopId ?? undefined)
    : [];
  const exactMatch = searchResults.some(
    (b) => b.name.toLowerCase() === trimmedQuery.toLowerCase()
  );

  const grouped = React.useMemo(() => {
    const map = new Map<string, Brand[]>();
    for (const brand of alphabetical) {
      const letter = brand.name[0]?.toUpperCase() ?? "#";
      const bucket = map.get(letter) ?? [];
      bucket.push(brand);
      map.set(letter, bucket);
    }
    return map;
  }, [alphabetical]);
  const letters = Array.from(grouped.keys());

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function handleSelect(name: string | null) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  function scrollToLetter(letter: string) {
    sectionRefs.current[letter]?.scrollIntoView({ block: "start" });
  }

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-line bg-surface px-4 text-left text-[15px] transition-colors hover:border-ink/30"
      >
        <span className={cn("truncate", value ? "text-ink" : "text-ink-soft/70")}>
          {value ?? "Add a brand (optional)"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </button>

      <Sheet open={open} onOpenChange={handleOpenChange} title="Choose a brand">
        <div className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brands"
              className="h-11 w-full rounded-full border border-line bg-surface-muted pl-9 pr-4 text-[15px] text-ink placeholder:text-ink-soft/70 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 pb-6">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="flex w-full items-center px-4 py-3 text-left text-[15px] text-ink-soft transition-colors hover:bg-surface-muted"
            >
              No specific brand
            </button>

            {trimmedQuery ? (
              <ul className="divide-y divide-line border-t border-line">
                {searchResults.map((brand) => (
                  <li key={brand.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(brand.name)}
                      className="flex w-full items-center px-4 py-3 text-left text-[15px] text-ink transition-colors hover:bg-surface-muted"
                    >
                      {brand.name}
                    </button>
                  </li>
                ))}
                {!exactMatch && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleSelect(trimmedQuery)}
                      className="flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                    >
                      <span className="text-[15px] text-primary-dark">
                        Use “{trimmedQuery}”
                      </span>
                      <span className="text-xs text-ink-soft">
                        Not in the catalogue — add it as a custom brand
                      </span>
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <>
                {popular.length > 0 && (
                  <div className="border-t border-line px-4 py-4">
                    <p className="mb-2.5 text-xs font-medium text-ink-soft">
                      {categoryTopId ? "Popular for this category" : "Popular brands"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {popular.map((brand) => (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => handleSelect(brand.name)}
                          className="rounded-full border border-primary/30 bg-primary-soft px-3.5 py-2 text-sm font-medium text-primary-dark transition-colors hover:border-primary/60"
                        >
                          {brand.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-line">
                  {letters.map((letter) => (
                    <div
                      key={letter}
                      className="scroll-mt-[69px]"
                      ref={(el) => {
                        sectionRefs.current[letter] = el;
                      }}
                    >
                      <p className="sticky top-[69px] bg-surface-muted px-4 py-1 text-xs font-semibold text-ink-soft">
                        {letter}
                      </p>
                      <ul className="divide-y divide-line">
                        {(grouped.get(letter) ?? []).map((brand) => (
                          <li key={brand.id}>
                            <button
                              type="button"
                              onClick={() => handleSelect(brand.name)}
                              className="flex w-full items-center px-4 py-3 text-left text-[15px] text-ink transition-colors hover:bg-surface-muted"
                            >
                              {brand.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {alphabetical.length === 0 && (
                    <p className="px-4 py-6 text-sm text-ink-soft">
                      No catalogued brands for this category yet — search above to add
                      your own.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {!trimmedQuery && letters.length > 3 && (
            <div className="sticky top-20 hidden h-fit shrink-0 flex-col items-center gap-0.5 py-4 pr-2 sm:flex">
              {letters.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => scrollToLetter(letter)}
                  className="grid h-4 w-4 place-items-center text-[10px] font-medium text-ink-soft hover:text-primary"
                >
                  {letter}
                </button>
              ))}
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
