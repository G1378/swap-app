"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandPicker } from "@/components/publish/BrandPicker";
import { CategoryPicker } from "@/components/publish/CategoryPicker";
import { PhotoUploader } from "@/components/publish/PhotoUploader";
import { WantedInput } from "@/components/publish/WantedInput";
import { categoryUsesSizes, getTopLevelCategory } from "@/lib/data/categories";
import { ITEM_CONDITIONS } from "@/lib/data/conditions";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  validateListing,
} from "@/lib/validation/listing";
import { createListing } from "@/services/listings";
import type { CashPreference, ListingDraft, ListingErrors } from "@/types/listing";

const EMPTY_DRAFT: ListingDraft = {
  photos: [],
  title: "",
  description: "",
  categoryId: null,
  brand: null,
  condition: null,
  size: "",
  wantedInReturn: [],
  cashPreference: "swap-only",
  cashTopUp: "",
  location: "",
};

/** Order in which we look for the first invalid field after a failed submit. */
const FIELD_ORDER: (keyof ListingDraft)[] = [
  "photos",
  "title",
  "categoryId",
  "condition",
  "size",
  "description",
  "cashTopUp",
];

const CASH_OPTIONS: readonly { value: CashPreference; label: string }[] = [
  { value: "swap-only", label: "Swap only" },
  { value: "top-up-ok", label: "Open to a cash top-up" },
];

interface PublishedState {
  title: string;
  persisted: boolean;
}

export function PublishForm() {
  const [draft, setDraft] = React.useState<ListingDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = React.useState<ListingErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [published, setPublished] = React.useState<PublishedState | null>(null);

  // Release object URLs for photo previews when the form unmounts.
  const photosRef = React.useRef(draft.photos);
  React.useEffect(() => {
    photosRef.current = draft.photos;
  }, [draft.photos]);
  React.useEffect(() => {
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  const topCategoryId = draft.categoryId
    ? getTopLevelCategory(draft.categoryId)?.id
    : undefined;
  const showSize = categoryUsesSizes(topCategoryId);
  const conditionHint = ITEM_CONDITIONS.find((c) => c.value === draft.condition)?.hint;

  function update<K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const found = validateListing(draft);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) {
      const el = document.getElementById(`field-${firstInvalid}`);
      el?.scrollIntoView({ block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createListing(draft);
      setPublished({ title: draft.title.trim(), persisted: result.persisted });
      window.scrollTo({ top: 0 });
    } catch {
      setSubmitError("Could not publish your listing. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    draft.photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setPublished(null);
  }

  if (published) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">Published</h2>
        <p className="mt-2 text-ink-soft">
          “
          {published.title}
          ” is ready to swap.
        </p>
        {!published.persisted && (
          <p className="mx-auto mt-4 max-w-sm rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
            Demo build: listings are not saved yet. Connect Supabase in
            services/listings.ts to store them.
          </p>
        )}
        <Button className="mt-8" variant="outline" onClick={handleReset}>
          List another item
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8 pb-6">
      <section className="space-y-6">
        <Field id="field-photos" label="Photos" error={errors.photos}>
          <PhotoUploader
            id="field-photos"
            photos={draft.photos}
            onChange={(photos) => update("photos", photos)}
            error={!!errors.photos}
          />
        </Field>

        <Field id="field-title" label="Title" error={errors.title}>
          <Input
            id="field-title"
            value={draft.title}
            maxLength={MAX_TITLE_LENGTH}
            placeholder="e.g. Sony A7 III body, boxed"
            error={!!errors.title}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "field-title-error" : undefined}
            onChange={(e) => update("title", e.target.value)}
          />
        </Field>

        <Field id="field-categoryId" label="Category" error={errors.categoryId}>
          <CategoryPicker
            id="field-categoryId"
            value={draft.categoryId}
            error={!!errors.categoryId}
            onChange={(id) => update("categoryId", id)}
          />
        </Field>

        <Field
          id="field-brand"
          label="Brand"
          hint={
            draft.categoryId
              ? undefined
              : "Choose a category first to see the most relevant brands."
          }
        >
          <BrandPicker
            id="field-brand"
            value={draft.brand}
            categoryTopId={topCategoryId}
            onChange={(brand) => update("brand", brand)}
          />
        </Field>

        <Field id="field-condition" label="Condition" error={errors.condition}>
          <ChipGroup
            id="field-condition"
            ariaLabel="Condition"
            options={ITEM_CONDITIONS}
            value={draft.condition}
            onChange={(condition) => update("condition", condition)}
          />
          {conditionHint && <p className="text-xs text-ink-soft">{conditionHint}</p>}
        </Field>

        {showSize && (
          <Field id="field-size" label="Size" error={errors.size}>
            <Input
              id="field-size"
              value={draft.size}
              maxLength={20}
              placeholder="e.g. M, UK 9, 3-4 years"
              error={!!errors.size}
              aria-invalid={!!errors.size}
              aria-describedby={errors.size ? "field-size-error" : undefined}
              onChange={(e) => update("size", e.target.value)}
            />
          </Field>
        )}

        <Field
          id="field-description"
          label="Description"
          hint="Optional. Mention accessories, faults, and anything a swapper should know."
          error={errors.description}
        >
          <Textarea
            id="field-description"
            rows={5}
            value={draft.description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            error={!!errors.description}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "field-description-error" : undefined}
            onChange={(e) => update("description", e.target.value)}
          />
          <p className="text-right text-xs text-ink-soft">
            {draft.description.length}/{MAX_DESCRIPTION_LENGTH}
          </p>
        </Field>
      </section>

      <section className="space-y-6 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">What you would take in return</h2>
        <Field
          id="field-wantedInReturn"
          label="Items you want"
          hint="Optional. The more you add, the more swaps you can be matched with."
        >
          <WantedInput
            id="field-wantedInReturn"
            value={draft.wantedInReturn}
            onChange={(items) => update("wantedInReturn", items)}
          />
        </Field>

        <Field id="field-cashPreference" label="Cash">
          <ChipGroup
            id="field-cashPreference"
            ariaLabel="Cash preference"
            options={CASH_OPTIONS}
            value={draft.cashPreference}
            onChange={(pref) => update("cashPreference", pref)}
          />
        </Field>

        {draft.cashPreference === "top-up-ok" && (
          <Field
            id="field-cashTopUp"
            label="Top-up you would accept (£)"
            hint="Optional. Useful when two items are not quite equal in value."
            error={errors.cashTopUp}
          >
            <Input
              id="field-cashTopUp"
              inputMode="decimal"
              value={draft.cashTopUp}
              placeholder="15"
              error={!!errors.cashTopUp}
              aria-invalid={!!errors.cashTopUp}
              aria-describedby={errors.cashTopUp ? "field-cashTopUp-error" : undefined}
              onChange={(e) => update("cashTopUp", e.target.value)}
            />
          </Field>
        )}
      </section>

      <section className="space-y-6 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Where</h2>
        <Field
          id="field-location"
          label="Town or city"
          hint="Optional. Helps people find local swaps."
        >
          <Input
            id="field-location"
            value={draft.location}
            maxLength={60}
            placeholder="e.g. Crawley"
            onChange={(e) => update("location", e.target.value)}
          />
        </Field>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        {submitError && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {submitError}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Publishing
            </>
          ) : (
            "Publish listing"
          )}
        </Button>
      </div>
    </form>
  );
}
