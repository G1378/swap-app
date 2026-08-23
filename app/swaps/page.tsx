import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listSwapRequestsForUser } from "@/lib/swap-requests";
import { getUnreadMessageCounts } from "@/lib/messages";
import { SwapsList } from "@/components/swaps-list";

export default async function SwapsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [swapRequests, unreadCountsMap] = await Promise.all([
    listSwapRequestsForUser(supabase, user.id),
    getUnreadMessageCounts(supabase, user.id),
  ]);

  // Client components can't receive a Map across the server/client
  // boundary, so flatten it to a plain object here.
  const unreadCounts = Object.fromEntries(unreadCountsMap);

  return (
    <div className="container max-w-3xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My swaps</h1>
        <p className="mt-1 text-muted-foreground">Requests you've sent and received, all in one place.</p>
      </div>
      <SwapsList swapRequests={swapRequests} currentUserId={user.id} unreadCounts={unreadCounts} />
    </div>
  );
}
