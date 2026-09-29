"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_PHOTOS } from "@/lib/validation/listing";
import type { PhotoItem } from "@/types/listing";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  id?: string;
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  error?: boolean;
}

export function PhotoUploader({ id, photos, onChange, error }: PhotoUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((f) =>
      f.type.startsWith("image/")
    );
    const room = MAX_PHOTOS - photos.length;
    const added: PhotoItem[] = files.slice(0, room).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    onChange([...photos, ...added]);
    // Reset so picking the same file again still fires onChange.
    event.target.value = "";
  }

  function handleRemove(photo: PhotoItem) {
    URL.revokeObjectURL(photo.previewUrl);
    onChange(photos.filter((p) => p.id !== photo.id));
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-muted"
          >
            {/* Blob preview URLs can't go through next/image optimisation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.previewUrl}
              alt={`Photo ${index + 1}`}
              className="h-full w-full object-cover"
            />
            {index === 0 && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/75 px-2 py-0.5 text-[11px] font-medium text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(photo)}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/75 text-white transition-colors hover:bg-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
        {photos.length < MAX_PHOTOS && (
          <li>
            <button
              id={id}
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed bg-surface text-sm text-ink-soft transition-colors hover:border-primary hover:text-primary-dark",
                error ? "border-danger" : "border-line"
              )}
            >
              <ImagePlus className="h-6 w-6" />
              Add photos
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={handleFiles}
      />
      <p className="mt-2 text-xs text-ink-soft">
        {photos.length} of {MAX_PHOTOS} added. The first photo is your cover.
      </p>
    </div>
  );
}
