"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cancelSwapRequest, markSwapSideComplete, respondToSwapRequest } from "@/lib/swap-requests";
import { Button } from "@/components/ui/button";
import type { SwapRequestWithDetails } from "@/types";

interface SwapActionsProps {
  swapRequest: SwapRequestWithDetails;
  role: "sender" | "receiver";
  currentUserId: string;
}

export function SwapActions({ swapRequest, role, currentUserId }: SwapActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<void>) {
    setLoading(action);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const myCompletedAt = role === "sender" ? swapRequest.senderCompletedAt : swapRequest.receiverCompletedAt;
  const otherCompletedAt = role === "sender" ? swapRequest.receiverCompletedAt : swapRequest.senderCompletedAt;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {swapRequest.status === "pending" && role === "receiver" && (
          <>
            <Button
              className="gap-2"
              disabled={loading !== null}
              onClick={() => run("accept", () => respondToSwapRequest(supabase, swapRequest.id, "accepted"))}
            >
              {loading === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Accept
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={loading !== null}
              onClick={() => run("decline", () => respondToSwapRequest(supabase, swapRequest.id, "declined"))}
            >
              {loading === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Decline
            </Button>
          </>
        )}

        {(swapRequest.status === "pending" || swapRequest.status === "accepted") && (
          <Button
            variant="outline"
            className="gap-2"
            disabled={loading !== null}
            onClick={() => run("cancel", () => cancelSwapRequest(supabase, swapRequest.id))}
          >
            {loading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Cancel swap
          </Button>
        )}

        {swapRequest.status === "accepted" && !myCompletedAt && (
          <Button
            className="gap-2"
            disabled={loading !== null}
            onClick={() => run("complete", () => markSwapSideComplete(supabase, swapRequest.id, role))}
          >
            {loading === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Mark my side complete
          </Button>
        )}
      </div>

      {swapRequest.status === "accepted" && myCompletedAt && !otherCompletedAt && (
        <p className="text-sm text-muted-foreground">
          You've confirmed your side. Waiting on the other person to confirm theirs.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
