"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingCardWithOwner } from "@/components/listing-card-with-owner";
import type { Listing, Profile } from "@/types";

type SortOrder = "newest" | "oldest";

interface DiscoverGridProps {
  listings: Listing[];
  /** Owner profile (username + name only) keyed by listing.ownerId, for the
   * byline shown on each card. Missing entries just render no byline. */
  owners: Record<string, Pick<Profile, "username" | "fullName">>;
}

export function DiscoverGrid({ listings, owners }: DiscoverGridProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const categories = useMemo(() => Array.from(new Set(listings.map((l) => l.category))).sort(), [listings]);
  const conditions = useMemo(() => Array.from(new Set(listings.map((l) => l.condition))).sort(), [listings]);

  const filtered = useMemo(() => {
    const result = listings.filter((listing) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        listing.title.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q) ||
        (listing.wantedInReturn?.toLowerCase().includes(q) ?? false);
      const matchesCategory = !category || listing.category === category;
      const matchesCondition = !condition || listing.condition === condition;
      return matchesQuery && matchesCategory && matchesCondition;
    });

    return [...result].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });
  }, [listings, query, category, condition, sortOrder]);

  const hasActiveFilters = Boolean(query || category || condition || sortOrder !== "newest");

  function clearFilters() {
    setQuery("");
    setCategory(null);
    setCondition(null);
    setSortOrder("newest");
  }

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Category</span>
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

        {conditions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Condition</span>
            <button onClick={() => setCondition(null)}>
              <Badge variant={condition === null ? "default" : "outline"}>Any</Badge>
            </button>
            {conditions.map((c) => (
              <button key={c} onClick={() => setCondition(c)}>
                <Badge variant={condition === c ? "default" : "outline"}>{c}</Badge>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Sort</span>
            <button onClick={() => setSortOrder("newest")}>
              <Badge variant={sortOrder === "newest" ? "default" : "outline"}>Newest</Badge>
            </button>
            <button onClick={() => setSortOrder("oldest")}>
              <Badge variant={sortOrder === "oldest" ? "default" : "outline"}>Oldest</Badge>
            </button>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} item{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <p className="font-medium">No listings match your search yet.</p>
          <p className="text-sm">Try a different keyword or check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((listing) => (
            <ListingCardWithOwner key={listing.id} listing={listing} owner={owners[listing.ownerId] ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
