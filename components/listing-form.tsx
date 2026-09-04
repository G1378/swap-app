"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ImagePlus,
  ListChecks,
  Loader2,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getPhotosForListing } from "@/lib/listing-photos";
import { deleteListingImages } from "@/lib/storage";
import { bumpQuestProgress } from "@/lib/gamification/queries";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
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

/** A few starter suggestions per launch category for the "what would you
 * like in return" step — tap to append, rather than typing from scratch.
 * Deliberately just a handful per category (not exhaustive): these are
 * meant to get the field started quickly, not to replace free text, which
 * is why the underlying input is still fully editable. Keyed loosely
 * (Record<string, string[]>, not the LISTING_CATEGORIES literal union) so
 * an unrecognized/custom category value never throws — it just falls back
 * to the universal suggestion below. */
const WANT_SUGGESTIONS: Record<string, string[]> = {
  Gaming: ["Nintendo Switch", "Steam Deck", "PS5 games"],
  LEGO: ["Star Wars sets", "Technic sets", "Minifigures"],
  "Camera Equipment": ["Vintage lens", "Tripod", "Film camera"],
  "Musical Instruments": ["Electric guitar", "Vinyl records", "Synth"],
  "PC Components": ["Graphics card", "Mechanical keyboard", "SSD"],
  Other: ["Open to offers"],
};

function suggestionsForCategory(category: string): string[] {
  const base = WANT_SUGGESTIONS[category] ?? [];
  return Array.from(new Set([...base, "Open to offers"]));
}

export function ListingForm({ mode, userId, listing }: ListingFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [category, setCategory] = useState(
    listing?.category ?? LISTING_CATEGORIES[0],
  );
  const [condition, setCondition] = useState(
    listing?.condition ?? LISTING_CONDITIONS[0],
  );
  const [wantedInReturn, setWantedInReturn] = useState(
    listing?.wantedInReturn ?? "",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    listing?.imageUrl ?? null,
  );

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- Create-mode wizard state (unused, but harmless, in edit mode) ------
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStepError(null);
  }

  function toggleWantSuggestion(phrase: string) {
    const parts = wantedInReturn
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const exists = parts.some((p) => p.toLowerCase() === phrase.toLowerCase());
    const next = exists
      ? parts.filter((p) => p.toLowerCase() !== phrase.toLowerCase())
      : [...parts, phrase];
    setWantedInReturn(next.join(", "));
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

  // Accepts an optional event so it can be called both as a <form onSubmit>
  // handler (edit mode) and directly from a plain button's onClick (create
  // mode's wizard deliberately isn't one big <form> — see the note above
  // the step-3 publish button for why).
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
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
        await bumpQuestProgress(supabase, "list-an-item");
        setPublished(true);
        router.refresh();
      } else if (listing) {
        const { error: updateError } = await supabase
          .from("listings")
          .update(payload)
          .eq("id", listing.id);
        if (updateError) throw new Error(updateError.message);
        router.push("/profile");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
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

      const { error: deleteError } = await supabase
        .from("listings")
        .delete()
        .eq("id", listing.id);
      if (deleteError) throw new Error(deleteError.message);

      await deleteListingImages(supabase, [
        listing.imageUrl,
        ...galleryPhotos.map((p) => p.url),
      ]);

      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete listing.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function resetForAnotherListing() {
    setTitle("");
    setDescription("");
    setCategory(LISTING_CATEGORIES[0]);
    setCondition(LISTING_CONDITIONS[0]);
    setWantedInReturn("");
    setImageFile(null);
    setImagePreview(null);
    setError(null);
    setStepError(null);
    setPublished(false);
    setStep(1);
  }

  // --- Create mode: photo-first 3-step wizard ------------------------------
  if (mode === "create") {
    if (published) {
      return (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-reward-soft">
            <Check className="h-7 w-7 text-reward-soft-foreground" />
          </div>
          <p className="text-lg font-semibold">Listing posted</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            We&apos;ll notify you when someone wants to swap for it.
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-reward-soft px-3 py-1 text-xs font-semibold text-reward-soft-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            Counts toward your &ldquo;List an item&rdquo; quest
          </span>
          <div className="mt-4 flex w-full flex-col gap-2">
            <Button type="button" onClick={() => router.push("/profile")}>
              Go to my profile
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForAnotherListing}
            >
              List another item
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              step === 1 ? router.back() : setStep((step - 1) as 1 | 2 | 3)
            }
            aria-label={step === 1 ? "Cancel" : "Back"}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-medium">New listing</p>
          <span className="flex items-center gap-1 rounded-full bg-reward-soft px-2.5 py-1 text-[11px] font-semibold text-reward-soft-foreground">
            <ListChecks className="h-3 w-3" />
            Quest progress
          </span>
        </div>

        <div className="flex gap-1.5">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                s <= step ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="image">Cover photo</Label>
              <label
                htmlFor="image"
                className="relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted text-muted-foreground hover:bg-muted/70"
              >
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Listing preview"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-primary" />
                    <span className="text-sm">Tap to add a photo</span>
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
            </div>
            {stepError && (
              <p className="text-sm text-destructive">{stepError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Clear photos get more swap offers. You can add more photos after
              posting.
            </p>
            <Button
              type="button"
              className="mt-2"
              onClick={() => {
                if (!imagePreview) {
                  setStepError("Add a photo to continue");
                  return;
                }
                setStepError(null);
                setStep(2);
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                maxLength={80}
                placeholder="e.g. Nintendo Switch OLED"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setStepError(null);
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                maxLength={1000}
                placeholder="Condition details, what's included, why you're swapping it..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setStepError(null);
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {LISTING_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      category === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Condition</Label>
              <div className="flex flex-wrap gap-2">
                {LISTING_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      condition === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {stepError && (
              <p className="text-sm text-destructive">{stepError}</p>
            )}
            <Button
              type="button"
              className="mt-2"
              onClick={() => {
                if (!title.trim() || !description.trim()) {
                  setStepError("Add a title and description to continue");
                  return;
                }
                setStepError(null);
                setStep(3);
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wanted">What would you like in return?</Label>
              <div className="flex flex-wrap gap-2">
                {suggestionsForCategory(category).map((s) => {
                  const active = wantedInReturn
                    .split(",")
                    .map((p) => p.trim().toLowerCase())
                    .includes(s.toLowerCase());
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleWantSuggestion(s)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <Input
                id="wanted"
                placeholder="Or type your own, comma-separated"
                value={wantedInReturn}
                onChange={(e) => setWantedInReturn(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* type="button" + onClick, not type="submit" — this step
                isn't inside a <form>, on purpose: an implicit Enter-key
                submission from an earlier step's text input could
                otherwise fire this with incomplete state (see
                handleSubmit's optional event param above). */}
            <Button
              type="button"
              disabled={loading}
              className="mt-2 gap-2"
              onClick={() => handleSubmit()}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Publish listing
            </Button>
          </div>
        )}
      </div>
    );
  }

  // --- Edit mode: original single-page form --------------------------------
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
            <Image
              src={imagePreview}
              alt="Listing preview"
              fill
              className="object-cover"
            />
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
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {LISTING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="condition">Condition</Label>
          <Select
            id="condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
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
            Save changes
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        {listing &&
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
              {listing.status === "pending"
                ? "part of a pending swap"
                : "marked as swapped"}
              .
            </p>
          ))}
      </div>
    </form>
  );
}
