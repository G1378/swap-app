import { CheckCircle2, Circle, Heart, ListChecks, MessageSquare, Repeat2, Star, type LucideIcon } from "lucide-react";
import { Coins, Sparkles } from "lucide-react";
import type { UserQuestProgressWithQuest } from "@/types";

// Maps known quest slugs to an icon. Falls back to ListChecks for any
// quest an admin adds later without updating this map — the card still
// renders correctly, just with a generic icon.
const QUEST_ICONS: Record<string, LucideIcon> = {
  "list-an-item": ListChecks,
  "reply-to-a-match": MessageSquare,
  "complete-a-swap": Repeat2,
  "update-your-wishlist": Heart,
  "leave-a-rating": Star,
};

export function QuestCard({ progress }: { progress: UserQuestProgressWithQuest }) {
  const { quest } = progress;
  const completed = progress.status === "completed";
  const Icon = QUEST_ICONS[quest.slug] ?? ListChecks;

  return (
    <div
      className={
        completed
          ? "flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
          : "flex items-center gap-3 rounded-xl border border-border p-3"
      }
    >
      <span
        className={
          completed
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        }
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className={completed ? "text-sm font-medium line-through" : "text-sm font-medium"}>{quest.title}</p>
        <p className="truncate text-xs text-muted-foreground">{quest.description}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3" />+{quest.xpReward}
          {quest.pointsReward > 0 && (
            <>
              <Coins className="ml-1 h-3 w-3" />+{quest.pointsReward}
            </>
          )}
        </span>
        {completed ? (
          <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Completed" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" aria-label="Not completed yet" />
        )}
      </div>
    </div>
  );
}