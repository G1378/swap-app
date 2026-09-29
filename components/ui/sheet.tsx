"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  /** Rendered left of the title — typically a back button while drilled into a level. */
  leading?: React.ReactNode;
}

/**
 * A picker surface: takes over the full screen on mobile (matching how
 * Vinted's and eBay's category/brand pickers behave on a phone) and
 * settles into a right-anchored panel from the `md` breakpoint up.
 */
export function Sheet({ open, onOpenChange, title, children, leading }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col bg-surface focus:outline-none",
            "inset-0 animate-slide-up",
            "md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-md md:animate-slide-in md:shadow-panel"
          )}
        >
          <div className="flex items-center gap-1 border-b border-line px-3 py-3.5">
            {leading}
            <Dialog.Title className="flex-1 truncate px-1 text-base font-semibold text-ink">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
