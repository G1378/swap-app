"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addListingPhoto, deleteListingPhoto, MAX_GALLERY_PHOTOS } from "@/lib/listing-photos";
import { deleteListingImages } from "@/lib/storage";
import type { ListingPhoto } from "@/types";

interface ListingGalleryProps {
  listingId: string;
  userId: string;
  initialPhotos: ListingPhoto[];
}

/**
 * Additional photos beyond the cover. Unlike the rest of the listing form,
 * changes here save immediately (add = upload + insert, remove = delete)
 * rather than waiting for the form's own submit button — each photo is its
 * own row, so there's nothing to batch.
 */
export function ListingGallery({ listingId, userId, initialPhotos }: ListingGalleryProps) {
  const supabase = createClient();
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atLimit = photos.length >= MAX_GALLERY_PHOTOS;

  async function handleAdd(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || atLimit) return;

    setError(null);
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      const photo = await addListingPhoto(supabase, listingId, data.publicUrl, photos.length);
      setPhotos((prev) => [...prev, photo]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(photo: ListingPhoto) {
    setDeletingId(photo.id);
    setError(null);

    try {
      await deleteListingPhoto(supabase, photo.id);
      await deleteListingImages(supabase, [photo.url]);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove photo.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-border">
            <Image src={photo.url} alt="" fill className="object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(photo)}
              disabled={deletingId === photo.id}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
            >
              {deletingId === photo.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            </button>
          </div>
        ))}

        {!atLimit && (
          <label
            htmlFor="gallery-photo"
            className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:bg-muted/70"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-xs">Add</span>
          </label>
        )}
      </div>

      <input
        id="gallery-photo"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleAdd}
        disabled={uploading || atLimit}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {photos.length}/{MAX_GALLERY_PHOTOS} additional photos. Changes here save immediately.
      </p>
    </div>
  );
}
