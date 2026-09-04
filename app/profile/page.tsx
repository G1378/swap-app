import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/profile/profile-view";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fallbackUsername = user.email?.split("@")[0] ?? "user";

  return <ProfileView profileId={user.id} fallbackUsername={fallbackUsername} viewerId={user.id} />;
}
