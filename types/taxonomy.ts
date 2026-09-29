/**
 * A node in the category tree. Categories can nest to any depth; the
 * publish flow lets a user stop at any level (e.g. list under the top
 * category "Cameras & Photography" without picking a specific lens type).
 */
export interface Category {
  id: string;
  name: string;
  /** Shown as a quick-pick chip at the root of the category picker. */
  featured?: boolean;
  children?: Category[];
}

/** A category together with the chain of ancestors that leads to it. */
export interface CategoryPathEntry {
  category: Category;
  path: Category[];
}

export interface Brand {
  id: string;
  name: string;
  /** Top-level category ids this brand commonly appears under. */
  categories: string[];
  /** Shown as a quick-pick chip above the alphabetical brand list. */
  popular?: boolean;
}
