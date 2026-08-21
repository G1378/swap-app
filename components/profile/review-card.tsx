import Link from "next/link";
import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { RatingWithAuthor } from "@/types";

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function ReviewCard({ rating }: { rating: RatingWithAuthor }) {
  const authorName = rating.author?.fullName || rating.author?.username || "A swapper";

  return (
    <div className="flex gap-3 rounded-xl border border-border p-4">
      <Avatar alt={authorName} fallback={authorName} src={rating.author?.avatarUrl} size={40} />
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={rating.author ? `/profile/${rating.author.username}` : "#"}
            className="font-medium hover:underline"
          >
            {authorName}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo(rating.createdAt)}</span>
        </div>
        <div className="mt-1 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("h-3.5 w-3.5", i < rating.score ? "fill-primary text-primary" : "text-muted-foreground/30")}
            />
          ))}
        </div>
        {rating.comment && <p className="mt-2 text-sm text-muted-foreground">{rating.comment}</p>}
      </div>
    </div>
  );
}
