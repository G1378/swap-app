"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPhotosForListing } from "@/lib/listing-photos";
import { deleteListingImages } from "@/lib/storage";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { Listing } from "@/types";

interface ListingFormProps {
  mode: "create" | "edit";
  userId: string;
  listing?: Listing;
}

export function ListingForm({ mode, userId, listing }: ListingFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [category, setCategory] = useState(listing?.category ?? LISTING_CATEGORIES[0]);
  const [condition, setCondition] = useState(listing?.condition ?? LISTING_CONDITIONS[0]);
  const [wantedInReturn, setWantedInReturn] = useState(listing?.wantedInReturn ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(listing?.imageUrl ?? null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return listing?.imageUrl ?? null;

    const ext = imageFile.name.split(".").pop();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, imageFile, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const imageUrl = await uploadImage();

      const payload = {
        title,
        description,
        category,
        condition,
        wanted_in_return: wantedInReturn || null,
        image_url: imageUrl,
      };

      if (mode === "create") {
        const { error: insertError } = await supabase
          .from("listings")
          .insert({ ...payload, owner_id: userId, status: "available" });
        if (insertError) throw new Error(insertError.message);
      } else if (listing) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", listing.id);
        if (updateError) throw new Error(updateError.message);
      }

      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!listing) return;
    if (!confirm("Delete this listing? This can't be undone.")) return;

    setDeleting(true);
    setError(null);

    try {
      // Gather gallery photo URLs before the row (and its listing_photos
      // rows, via cascade) disappear, so storage cleanup has something to
      // work from.
      const galleryPhotos = await getPhotosForListing(supabase, listing.id);

      const { error: deleteError } = await supabase.from("listings").delete().eq("id", listing.id);
      if (deleteError) throw new Error(deleteError.message);

      await deleteListingImages(supabase, [listing.imageUrl, ...galleryPhotos.map((p) => p.url)]);

      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Image */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="image">Cover photo</Label>
        <label
          htmlFor="image"
          className="relative flex aspect-[4/3] w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-border bg-muted text-muted-foreground hover:bg-muted/70"
        >
          {imagePreview ? (
            <Image src={imagePreview} alt="Listing preview" fill className="object-cover" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm">Click to upload a photo</span>
            </>
          )}
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleImageChange}
        />
        {mode === "create" && (
          <p className="text-xs text-muted-foreground">You can add more photos after creating the listing.</p>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          maxLength={80}
          placeholder="e.g. Nintendo Switch OLED"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          required
          maxLength={1000}
          placeholder="Condition details, what's included, why you're swapping it..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Category + condition */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {LISTING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="condition">Condition</Label>
          <Select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
            {LISTING_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Wanted in return */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="wanted">What would you like in return?</Label>
        <Input
          id="wanted"
          placeholder="e.g. Steam Deck, or 'open to offers'"
          value={wantedInReturn}
          onChange={(e) => setWantedInReturn(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? "Publish listing" : "Save changes"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        {mode === "edit" &&
          listing &&
          (listing.status === "available" ? (
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              disabled={deleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          ) : (
            <p className="max-w-[14rem] text-right text-xs text-muted-foreground">
              Can&apos;t delete while this listing is{" "}
              {listing.status === "pending" ? "part of a pending swap" : "marked as swapped"}.
            </p>
          ))}
      </div>
    </form>
  );
}
