import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGamificationProfile } from "@/lib/gamification/queries";
import { PointsShop } from "@/components/gamification/points-shop";

export default async function ShopPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const gamification = await getGamificationProfile(supabase, user.id);

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Points shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spend points earned from swaps, streaks, and quests on real perks.
        </p>
      </div>
      <PointsShop initialBalance={gamification?.pointsBalance ?? 0} />
    </div>
  );
}
