"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SwapStatusBadge } from "@/components/swap-status-badge";
import type { Listing, SwapRequestWithDetails } from "@/types";

type Tab = "action" | "active" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "action", label: "Needs your action" },
  { id: "active", label: "Active" },
  { id: "history", label: "History" },
];

/** Turns a bundle (plus any points riding along with it) into one short
 * phrase, e.g. "Camera + 2 more + 20 pts". Used for both sides of the
 * trade in the list row — either can now hold more than one item. */
function describeBundle(items: Listing[], points: number): string {
  const itemsPart =
    items.length === 0 ? "an item" : items.length === 1 ? items[0].title : `${items[0].title} + ${items.length - 1} more`;
  return points > 0 ? `${itemsPart} + ${points} pts` : itemsPart;
}

export function SwapsList({
  swapRequests,
  currentUserId,
  unreadCounts,
}: {
  swapRequests: SwapRequestWithDetails[];
  currentUserId: string;
  /** Unread message count keyed by conversation id. */
  unreadCounts: Record<string, number>;
}) {
  const [tab, setTab] = useState<Tab>("action");

  const grouped = useMemo(() => {
    const action = swapRequests.filter((sr) => sr.status === "pending" && sr.receiverId === currentUserId);
    const active = swapRequests.filter(
      (sr) => sr.status === "accepted" || (sr.status === "pending" && sr.senderId === currentUserId)
    );
    const history = swapRequests.filter((sr) =>
      (["completed", "declined", "cancelled", "countered"] as const).includes(
        sr.status as "completed" | "declined" | "cancelled" | "countered"
      )
    );
    return { action, active, history };
  }, [swapRequests, currentUserId]);

  const shown = grouped[tab];

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}>
            <Badge variant={tab === t.id ? "default" : "outline"} className="px-3 py-1.5 text-sm">
              {t.label}
              {grouped[t.id].length > 0 && <span className="ml-1.5 opacity-70">{grouped[t.id].length}</span>}
            </Badge>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <ArrowRightLeft className="h-8 w-8" />
          <p className="font-medium">Nothing here yet.</p>
          <p className="text-sm">
            {tab === "action"
              ? "You'll see incoming swap requests here."
              : "Browse Discover to find something to swap for."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((sr) => {
            const isSender = sr.senderId === currentUserId;
            const otherProfile = isSender ? sr.receiver : sr.sender;
            const unread = sr.conversationId ? unreadCounts[sr.conversationId] ?? 0 : 0;

            // offeredListings/offeredPoints always belong to whoever sent
            // this round; requestedListings/requestedPoints to whoever
            // received it — map those onto "your side" vs "their side"
            // for the current viewer.
            const yourItems = isSender ? sr.offeredListings : sr.requestedListings;
            const yourPoints = isSender ? sr.offeredPoints : sr.requestedPoints;
            const theirItems = isSender ? sr.requestedListings : sr.offeredListings;
            const theirPoints = isSender ? sr.requestedPoints : sr.offeredPoints;

            return (
              <li key={sr.id}>
                <Link
                  href={`/swaps/${sr.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-accent/50"
                >
                  <MiniThumbStack listings={theirItems} />
                  <ArrowRightLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <MiniThumbStack listings={yourItems} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {isSender ? "You offered" : "They offered"} {describeBundle(yourItems, yourPoints)} for{" "}
                      {describeBundle(theirItems, theirPoints)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {isSender ? "To" : "From"} {otherProfile?.fullName || otherProfile?.username || "a swapper"}
                    </p>
                  </div>

                  {unread > 0 && (
                    <Badge variant="accent" className="shrink-0">
                      {unread} new
                    </Badge>
                  )}
                  <SwapStatusBadge status={sr.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MiniThumbStack({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Package className="h-4 w-4" />
        </div>
      </div>
    );
  }

  const cover = listings[0];
  const extra = listings.length - 1;

  return (
    <div className="relative h-12 w-12 shrink-0">
      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-muted">
        {cover.imageUrl ? (
          <Image src={cover.imageUrl} alt={cover.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-4 w-4" />
          </div>
        )}
      </div>
      {extra > 0 && (
        <span className="absolute -bottom-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border border-border bg-background px-1 text-[10px] font-semibold">
          +{extra}
        </span>
      )}
    </div>
  );
}
