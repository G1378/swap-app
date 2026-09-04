import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/profiles";
import { ProfileView } from "@/components/profile/profile-view";

interface PageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `@${params.username} · SwapApp` };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfileByUsername(supabase, params.username);

  if (!profile) {
    notFound();
  }

  if (user?.id === profile.id) {
    redirect("/profile");
  }

  return <ProfileView profileId={profile.id} fallbackUsername={profile.username} viewerId={user?.id ?? null} />;
}
