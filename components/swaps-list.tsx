"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightLeft, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SwapStatusBadge } from "@/components/swap-status-badge";
import type { SwapRequestWithDetails } from "@/types";

type Tab = "action" | "active" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "action", label: "Needs your action" },
  { id: "active", label: "Active" },
  { id: "history", label: "History" },
];

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
    const history = swapRequests.filter((sr) => sr.status === "completed" || sr.status === "declined" || sr.status === "cancelled");
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
            const theirItem = sr.listing;
            const yourItem = sr.offeredListing;
            const unread = sr.conversationId ? unreadCounts[sr.conversationId] ?? 0 : 0;

            return (
              <li key={sr.id}>
                <Link
                  href={`/swaps/${sr.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-accent/50"
                >
                  <MiniThumb listing={isSender ? theirItem : yourItem} />
                  <ArrowRightLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <MiniThumb listing={isSender ? yourItem : theirItem} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {isSender ? "You offered" : "They offered"} {yourItem?.title ?? "an item"} for{" "}
                      {theirItem?.title ?? "an item"}
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

function MiniThumb({ listing }: { listing: SwapRequestWithDetails["listing"] }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {listing?.imageUrl ? (
        <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Package className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
