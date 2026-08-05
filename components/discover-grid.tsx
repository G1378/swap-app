"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/types";

export function DiscoverGrid({ listings }: { listings: Listing[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(listings.map((l) => l.category))),
    [listings]
  );

  const filtered = useMemo(() => {
    return listings.filter((listing) => {
      const matchesQuery =
        !query ||
        listing.title.toLowerCase().includes(query.toLowerCase()) ||
        listing.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || listing.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [listings, query, category]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items, e.g. 'PS5 controller'"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategory(null)}>
              <Badge variant={category === null ? "default" : "outline"}>All</Badge>
            </button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}>
                <Badge variant={category === c ? "default" : "outline"}>{c}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <p className="font-medium">No listings match your search yet.</p>
          <p className="text-sm">Try a different keyword or check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
