import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGamificationProfile, getQuestBoard } from "@/lib/gamification/queries";
import { QuestCard } from "@/components/gamification/quest-card";

export default async function QuestsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const gamification = await getGamificationProfile(supabase, user.id);

  // Provisioned automatically for every profile (see 0010's onboarding
  // trigger) — null here would mean that hasn't run yet, which shouldn't
  // happen in practice, but render an empty state rather than crash.
  const board = gamification ? await getQuestBoard(supabase, gamification.id) : { weekly: [], seasonal: [] };

  const completedThisWeek = board.weekly.filter((q) => q.status === "completed").length;

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Quests</h1>
        <p className="mt-1 text-muted-foreground">
          Small things worth doing this week — done just by using swap-app normally.
        </p>
      </div>

      {!gamification ? (
        <p className="text-sm text-muted-foreground">
          Your quest board isn't ready yet — check back in a moment.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">This week</h2>
              <span className="text-sm text-muted-foreground">
                {completedThisWeek} / {board.weekly.length} done
              </span>
            </div>
            {board.weekly.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weekly quests available right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {board.weekly.map((progress) => (
                  <QuestCard key={progress.id} progress={progress} />
                ))}
              </div>
            )}
          </section>

          {board.seasonal.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Seasonal</h2>
              </div>
              <div className="flex flex-col gap-2">
                {board.seasonal.map((progress) => (
                  <QuestCard key={progress.id} progress={progress} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
