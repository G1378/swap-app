"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListingPhoto } from "@/types";

interface ListingPhotoViewerProps {
  title: string;
  coverUrl: string | null;
  photos: ListingPhoto[];
}

export function ListingPhotoViewer({ title, coverUrl, photos }: ListingPhotoViewerProps) {
  const allUrls = [coverUrl, ...photos.map((p) => p.url)].filter((u): u is string => Boolean(u));
  const [activeUrl, setActiveUrl] = useState<string | null>(allUrls[0] ?? null);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted">
        {activeUrl ? (
          <Image src={activeUrl} alt={title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12" />
          </div>
        )}
      </div>

      {allUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {allUrls.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveUrl(url)}
              aria-label="Show this photo"
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2",
                activeUrl === url ? "border-primary" : "border-transparent"
              )}
            >
              <Image src={url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
