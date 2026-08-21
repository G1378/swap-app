import { Star } from "lucide-react";
import type { RatingBreakdown as RatingBreakdownData, RatingSummary } from "@/types";

interface RatingBreakdownProps {
  breakdown: RatingBreakdownData;
  summary: RatingSummary;
}

export function RatingBreakdown({ breakdown, summary }: RatingBreakdownProps) {
  if (breakdown.total === 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border p-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col items-center gap-1 sm:w-32">
        <span className="text-3xl font-bold">{summary.average!.toFixed(1)}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < Math.round(summary.average!) ? "fill-primary text-primary" : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {summary.count} review{summary.count === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = breakdown.counts[star];
          const pct = breakdown.total > 0 ? Math.round((count / breakdown.total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3">{star}</span>
              <Star className="h-3 w-3 fill-muted-foreground/40 text-muted-foreground/40" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
