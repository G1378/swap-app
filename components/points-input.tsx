import { Coins } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PointsInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** The relevant available balance, shown as a hint and used to clamp the
   * input. Omit if unknown (e.g. the other party's balance isn't loaded) —
   * the field still works, just without a visible ceiling; the server is
   * always the real source of truth for whether it's actually affordable. */
  maxAvailable?: number;
}

/** A small "add points to this deal" control. Points are always optional
 * and always on top of an item bundle — this input never appears without
 * an OfferBuilder alongside it. */
export function PointsInput({ id, label, value, onChange, maxAvailable }: PointsInputProps) {
  function handleChange(raw: string) {
    const parsed = Math.max(0, Math.floor(Number(raw) || 0));
    onChange(maxAvailable !== undefined ? Math.min(parsed, maxAvailable) : parsed);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Coins className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={maxAvailable}
        step={1}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => handleChange(e.target.value)}
        className="w-32"
      />
      <p className="text-xs text-muted-foreground">
        Optional — sweetens the deal without needing a perfectly matched trade.
        {maxAvailable !== undefined ? ` You have ${maxAvailable.toLocaleString()} points available.` : null}
      </p>
    </div>
  );
}
