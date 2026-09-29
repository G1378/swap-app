"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ListingCard } from "@/components/feed/ListingCard";
import { categories, getTopLevelCategory } from "@/lib/data/categories";
import { mockListings } from "@/lib/data/mockListings";
import { cn } from "@/lib/utils";

const featuredCategories = categories.filter((c) => c.featured);

export function FeedView() {
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  const listings = activeCategory
    ? mockListings.filter(
        (listing) => getTopLevelCategory(listing.categoryId)?.id === activeCategory
      )
    : mockListings;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-base font-semibold tracking-tight text-ink">
            swap-app
          </Link>
          <Link
            href="/publish"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            List an item
          </Link>
        </div>
        <div className="no-scrollbar mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              activeCategory === null
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:border-ink/30"
            )}
          >
            All
          </button>
          {featuredCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                activeCategory === category.id
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-surface text-ink hover:border-ink/30"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {listings.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-soft">
            No swaps in this category yet.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <li key={listing.id}>
                <ListingCard listing={listing} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <Link
        href="/publish"
        aria-label="List an item"
        className="fixed bottom-6 right-4 z-10 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-panel transition-colors hover:bg-primary-dark md:right-8"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
