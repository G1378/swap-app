"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRating } from "@/lib/ratings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Profile, Rating } from "@/types";

interface RatingPanelProps {
  swapRequestId: string;
  authorId: string;
  subject: Profile;
  existingRating: Rating | null;
}

export function RatingPanel({ swapRequestId, authorId, subject, existingRating }: RatingPanelProps) {
  const router = useRouter();
  const supabase = createClient();

  const [score, setScore] = useState(existingRating?.score ?? 0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(!!existingRating);

  if (submitted) {
    return (
      <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        You rated {subject.fullName || subject.username} {existingRating?.score ?? score} / 5. Thanks for helping
        keep the community trustworthy!
      </div>
    );
  }

  async function handleSubmit() {
    if (score === 0) {
      setError("Pick a star rating first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createRating(supabase, { authorId, subjectId: subject.id, swapRequestId, score, comment });
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <p className="text-sm font-medium">Rate {subject.fullName || subject.username}</p>

      <div className="flex gap-1" onMouseLeave={() => setHoverScore(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onMouseEnter={() => setHoverScore(value)}
            onClick={() => setScore(value)}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hoverScore || score) >= value ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>

      <Textarea
        placeholder="Optional: how did the swap go?"
        maxLength={500}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-fit gap-2" onClick={handleSubmit} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit rating
      </Button>
    </div>
  );
}
