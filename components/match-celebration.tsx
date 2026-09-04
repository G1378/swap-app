"use client";

import {
  ArrowLeftRight,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { XP_AWARDS } from "@/lib/gamification/constants";

export interface CelebrationParticipant {
  name: string;
  avatarUrl: string | null;
  /** What this participant is giving up in the swap — shown as the
   * caption under their avatar in the chain visual. */
  itemTitle: string;
}

interface MatchCelebrationProps {
  open: boolean;
  onClose: () => void;
  /** The signed-in viewer, first in the chain. */
  you: CelebrationParticipant;
  /** Everyone else in the swap, in hand-off order. Just one entry for a
   * direct swap (the only kind that exists today) — the component
   * already renders a proper N-person chain if this ever has more than
   * one, since multi-person matching is a planned Future Feature and
   * this seemed like the one place worth not having to redo later. */
  others: CelebrationParticipant[];
  /** Scrolled/focused into view on "Start chatting", if provided. */
  messagesAnchorId?: string;
}

/**
 * Celebratory dialog shown right after a swap request is accepted (see
 * SwapActions). Reuses the shared Dialog primitive for its accessible
 * modal mechanics (portal, Escape/backdrop close, scroll lock) — only the
 * inner content is bespoke.
 */
export function MatchCelebration({
  open,
  onClose,
  you,
  others,
  messagesAnchorId,
}: MatchCelebrationProps) {
  const chain = [you, ...others];
  const isChain = chain.length > 2;

  function handleStartChatting() {
    onClose();
    if (!messagesAnchorId) return;
    // Deferred so it runs after the dialog has actually unmounted/closed.
    window.setTimeout(() => {
      document
        .getElementById(messagesAnchorId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="It's a swap"
      className="max-w-sm"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            {isChain
              ? `A ${chain.length}-way chain just closed.`
              : "You both agreed to the swap."}
          </p>
        </div>

        <div className="flex items-start justify-center gap-2 py-2">
          {chain.map((participant, i) => (
            <div className="contents" key={`${participant.name}-${i}`}>
              <div className="flex w-16 flex-col items-center gap-1">
                <Avatar
                  src={participant.avatarUrl}
                  alt={participant.name}
                  fallback={participant.name}
                  size={52}
                  className="border-2 border-border"
                />
                <p className="w-full truncate text-xs font-medium">
                  {i === 0 ? "You" : participant.name}
                </p>
                <p className="w-full truncate text-[11px] text-muted-foreground">
                  {participant.itemTitle}
                </p>
              </div>
              {i < chain.length - 1 && (
                <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {isChain && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <CornerDownLeft className="h-3.5 w-3.5" />
            {chain[chain.length - 1].name}&apos;s item loops back to you
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 rounded-full bg-reward-soft px-3 py-1.5 text-xs font-semibold text-reward-soft-foreground">
          <Sparkles className="h-3.5 w-3.5" />+{XP_AWARDS.SWAP_COMPLETED} xp
          once you both confirm it&apos;s complete
        </div>

        <div className="flex w-full flex-col gap-2 pt-2">
          <Button
            type="button"
            className="w-full"
            onClick={handleStartChatting}
          >
            Start chatting
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            View swap details
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
