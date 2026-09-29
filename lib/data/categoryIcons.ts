import {
  Backpack,
  BookOpen,
  Camera,
  Cpu,
  Gamepad2,
  Gem,
  Guitar,
  Baby as BabyIcon,
  Blocks,
  Dumbbell,
  Shirt,
  Smartphone,
  Sofa,
  Trophy,
  type LucideIcon,
} from "lucide-react";

interface CategoryVisual {
  icon: LucideIcon;
  /** Tailwind classes for the placeholder tile background + icon color. */
  tint: string;
}

const DEFAULT_VISUAL: CategoryVisual = {
  icon: Backpack,
  tint: "bg-surface-muted text-ink-soft",
};

/** Keyed by top-level category id (see lib/data/categories.ts). */
const categoryVisuals: Record<string, CategoryVisual> = {
  gaming: { icon: Gamepad2, tint: "bg-primary-soft text-primary-dark" },
  "pc-components": { icon: Cpu, tint: "bg-surface-muted text-ink" },
  cameras: { icon: Camera, tint: "bg-accent-soft text-accent" },
  instruments: { icon: Guitar, tint: "bg-primary-soft text-primary-dark" },
  "lego-toys": { icon: Blocks, tint: "bg-accent-soft text-accent" },
  electronics: { icon: Smartphone, tint: "bg-surface-muted text-ink" },
  "womens-fashion": { icon: Shirt, tint: "bg-accent-soft text-accent" },
  "mens-fashion": { icon: Shirt, tint: "bg-surface-muted text-ink" },
  "kids-baby": { icon: BabyIcon, tint: "bg-primary-soft text-primary-dark" },
  "home-living": { icon: Sofa, tint: "bg-accent-soft text-accent" },
  "sports-outdoors": { icon: Dumbbell, tint: "bg-primary-soft text-primary-dark" },
  "collectibles-hobbies": { icon: Trophy, tint: "bg-accent-soft text-accent" },
  "books-media": { icon: BookOpen, tint: "bg-surface-muted text-ink" },
  "watches-jewellery": { icon: Gem, tint: "bg-accent-soft text-accent" },
  "bags-accessories": { icon: Backpack, tint: "bg-primary-soft text-primary-dark" },
};

export function getCategoryVisual(topLevelCategoryId?: string): CategoryVisual {
  if (!topLevelCategoryId) return DEFAULT_VISUAL;
  return categoryVisuals[topLevelCategoryId] ?? DEFAULT_VISUAL;
}
