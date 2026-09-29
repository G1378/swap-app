import type { ItemCondition } from "@/lib/data/conditions";

/** A photo the user has added but not yet uploaded. */
export interface PhotoItem {
  id: string;
  file: File;
  /** Object URL for the local preview; revoke it when the photo is removed. */
  previewUrl: string;
}

export type CashPreference = "swap-only" | "top-up-ok";

/** Everything the publish form collects. */
export interface ListingDraft {
  photos: PhotoItem[];
  title: string;
  description: string;
  categoryId: string | null;
  brand: string | null;
  condition: ItemCondition | null;
  size: string;
  wantedInReturn: string[];
  cashPreference: CashPreference;
  /** Amount in pounds exactly as typed, e.g. "15" or "15.50". */
  cashTopUp: string;
  location: string;
}

export type ListingErrors = Partial<Record<keyof ListingDraft, string>>;

export interface CreateListingResult {
  id: string;
  /** False while the service is a stub and nothing is stored yet. */
  persisted: boolean;
}

/** A published listing, as shown in the feed. */
export interface Listing {
  id: string;
  title: string;
  categoryId: string;
  brand?: string | null;
  condition: ItemCondition;
  size?: string;
  wantedInReturn: string[];
  cashPreference: CashPreference;
  cashTopUp?: string;
  location?: string;
}
