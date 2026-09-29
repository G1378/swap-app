"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_WANTED = 8;

interface WantedInputProps {
  id?: string;
  value: string[];
  onChange: (items: string[]) => void;
}

/** Free-text wishlist: type an item, press Enter (or Add), get a removable chip. */
export function WantedInput({ id, value, onChange }: WantedInputProps) {
  const [draft, setDraft] = React.useState("");

  function add() {
    const item = draft.trim();
    if (!item || value.length >= MAX_WANTED) return;
    if (value.some((v) => v.toLowerCase() === item.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, item]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          maxLength={60}
          placeholder="e.g. Nintendo Switch OLED"
          disabled={value.length >= MAX_WANTED}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-12 w-12"
          aria-label="Add to wishlist"
          disabled={!draft.trim() || value.length >= MAX_WANTED}
          onClick={add}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1 rounded-full bg-accent-soft py-1.5 pl-3.5 pr-1.5 text-sm text-ink"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(value.filter((v) => v !== item))}
                className="grid h-6 w-6 place-items-center rounded-full text-ink-soft transition-colors hover:bg-accent/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
