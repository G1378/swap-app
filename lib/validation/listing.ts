import { categoryUsesSizes, getTopLevelCategory } from "@/lib/data/categories";
import type { ListingDraft, ListingErrors } from "@/types/listing";

export const MAX_PHOTOS = 10;
export const MAX_TITLE_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 1000;

/** Returns a map of field -> message. An empty object means the draft is valid. */
export function validateListing(draft: ListingDraft): ListingErrors {
  const errors: ListingErrors = {};

  if (draft.photos.length === 0) {
    errors.photos = "Add at least one photo.";
  }

  const title = draft.title.trim();
  if (title.length < 3) {
    errors.title = "Add a title of at least 3 characters.";
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`;
  }

  if (draft.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`;
  }

  if (!draft.categoryId) {
    errors.categoryId = "Choose a category.";
  }

  if (!draft.condition) {
    errors.condition = "Select a condition.";
  }

  const topId = draft.categoryId ? getTopLevelCategory(draft.categoryId)?.id : undefined;
  if (categoryUsesSizes(topId) && !draft.size.trim()) {
    errors.size = "Add a size, e.g. M, UK 9 or 3-4 years.";
  }

  if (
    draft.cashPreference === "top-up-ok" &&
    draft.cashTopUp.trim() !== "" &&
    !/^\d+(\.\d{1,2})?$/.test(draft.cashTopUp.trim())
  ) {
    errors.cashTopUp = "Enter an amount like 15 or 15.50.";
  }

  return errors;
}
