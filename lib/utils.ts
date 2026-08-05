import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts (e.g. "p-2" vs "p-4")
 * the same way shadcn/ui components expect.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
