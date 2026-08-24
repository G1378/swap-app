import { createClient } from "@/lib/supabase/server";
import { listProfiles } from "@/lib/profiles";
import { getBlockedEitherDirection } from "@/lib/blocks";
import { MemberSearchGrid } from "@/components/member-search-grid";

export default async function MembersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profiles, blockedIds] = await Promise.all([
    listProfiles(supabase),
    user ? getBlockedEitherDirection(supabase, user.id) : Promise.resolve(new Set<string>()),
  ]);

  const visibleProfiles = profiles.filter((p) => !blockedIds.has(p.id) && p.id !== user?.id);

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Members</h1>
        <p className="mt-1 text-muted-foreground">Find other swappers and see what they&apos;re trading.</p>
      </div>
      <MemberSearchGrid profiles={visibleProfiles} />
    </div>
  );
}
