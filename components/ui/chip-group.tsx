"use client";

import { cn } from "@/lib/utils";

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  id?: string;
  ariaLabel: string;
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/** Single-select group of pill buttons, exposed to assistive tech as radios. */
export function ChipGroup<T extends string>({
  id,
  ariaLabel,
  options,
  value,
  onChange,
}: ChipGroupProps<T>) {
  return (
    <div id={id} role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:border-ink/30"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
