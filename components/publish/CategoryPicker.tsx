"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import {
  categories,
  findCategoryPath,
  searchCategories,
} from "@/lib/data/categories";
import type { Category } from "@/types/taxonomy";
import { cn } from "@/lib/utils";

interface CategoryPickerProps {
  id?: string;
  value: string | null;
  onChange: (categoryId: string) => void;
  error?: boolean;
}

export function CategoryPicker({ id, value, onChange, error }: CategoryPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [currentId, setCurrentId] = React.useState<string | null>(null);

  const selected = value ? findCategoryPath(value) : undefined;
  const currentEntry = currentId ? findCategoryPath(currentId) : undefined;
  const levelNodes: Category[] = currentEntry
    ? currentEntry.category.children ?? []
    : categories;
  const trimmedQuery = query.trim();
  const searchResults = trimmedQuery ? searchCategories(trimmedQuery) : [];
  const featured = categories.filter((c) => c.featured);

  function resetNav() {
    setQuery("");
    setCurrentId(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetNav();
  }

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    resetNav();
  }

  function handleDrill(node: Category) {
    if (node.children && node.children.length > 0) {
      setCurrentId(node.id);
    } else {
      handleSelect(node.id);
    }
  }

  function handleBack() {
    if (!currentEntry) return;
    const parent = currentEntry.path[currentEntry.path.length - 2];
    setCurrentId(parent ? parent.id : null);
  }

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border bg-surface px-4 text-left text-[15px] transition-colors",
          error ? "border-danger" : "border-line hover:border-ink/30"
        )}
      >
        <span className={cn("truncate", selected ? "text-ink" : "text-ink-soft/70")}>
          {selected
            ? selected.path.map((c) => c.name).join(" \u203a ")
            : "Choose a category"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </button>

      <Sheet
        open={open}
        onOpenChange={handleOpenChange}
        title={currentEntry ? currentEntry.category.name : "Choose a category"}
        leading={
          currentEntry ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : undefined
        }
      >
        <div className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search categories"
              className="h-11 w-full rounded-full border border-line bg-surface-muted pl-9 pr-4 text-[15px] text-ink placeholder:text-ink-soft/70 focus:border-primary"
            />
          </div>
        </div>

        {trimmedQuery ? (
          <ul className="divide-y divide-line">
            {searchResults.length === 0 && (
              <li className="px-4 py-6 text-sm text-ink-soft">
                No categories match “{trimmedQuery}”.
              </li>
            )}
            {searchResults.map(({ category, path }) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(category.id)}
                  className="flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                >
                  <span className="text-[15px] text-ink">{category.name}</span>
                  {path.length > 1 && (
                    <span className="mt-0.5 text-xs text-ink-soft">
                      {path
                        .slice(0, -1)
                        .map((c) => c.name)
                        .join(" \u203a ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="pb-6">
            {!currentEntry && (
              <div className="px-4 pt-4">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                  <Sparkles className="h-3.5 w-3.5" />
                  Popular on swap-app
                </p>
                <div className="flex flex-wrap gap-2">
                  {featured.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleDrill(node)}
                      className="rounded-full border border-primary/30 bg-primary-soft px-3.5 py-2 text-sm font-medium text-primary-dark transition-colors hover:border-primary/60"
                    >
                      {node.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentEntry && (
              <div className="px-4 pt-4">
                <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
                  <button
                    type="button"
                    onClick={() => setCurrentId(null)}
                    className="hover:text-ink hover:underline"
                  >
                    All categories
                  </button>
                  {currentEntry.path.map((node, i) => (
                    <span key={node.id} className="flex items-center gap-1">
                      <span aria-hidden>›</span>
                      <button
                        type="button"
                        onClick={() => setCurrentId(node.id)}
                        className={cn(
                          "hover:text-ink hover:underline",
                          i === currentEntry.path.length - 1 && "font-medium text-ink"
                        )}
                      >
                        {node.name}
                      </button>
                    </span>
                  ))}
                </nav>
                <button
                  type="button"
                  onClick={() => handleSelect(currentEntry.category.id)}
                  className="mb-2 flex w-full items-center justify-between rounded-xl border border-dashed border-line px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:border-primary hover:text-primary-dark"
                >
                  Use “{currentEntry.category.name}” with no more specific subcategory
                </button>
              </div>
            )}

            <ul className="mt-1 divide-y divide-line px-1">
              {levelNodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => handleDrill(node)}
                    className="flex w-full items-center justify-between px-3 py-3.5 text-left text-[15px] text-ink transition-colors hover:bg-surface-muted"
                  >
                    {node.name}
                    {node.children && node.children.length > 0 && (
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>
    </>
  );
}
