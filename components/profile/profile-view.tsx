import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileById, getProfileListings, getCompletedSwapCount } from "@/lib/profiles";
import { getProfileRatingSummary, getRatingBreakdown, listRatingsForProfile } from "@/lib/ratings";
import { getWishlist, getWishlistedListingIds } from "@/lib/wishlist";
import { getGamificationProfile, getUserBadges } from "@/lib/gamification/queries";
import { computeBadges } from "@/lib/badges";
import { isBlocked } from "@/lib/blocks";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileTabsSection } from "@/components/profile/profile-tabs-section";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { ProfileActionsMenu } from "@/components/profile/profile-actions-menu";
import type { Profile } from "@/types";

interface ProfileViewProps {
  profileId: string;
  /** Used when the `profiles` row hasn't been fully filled in yet (own profile only). */
  fallbackUsername: string;
  viewerId: string | null;
}

function formatMemberSince(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(iso));
}

export async function ProfileView({ profileId, fallbackUsername, viewerId }: ProfileViewProps) {
  const supabase = createClient();
  const isOwnProfile = viewerId === profileId;

  const [profile, listings, ratingSummary, ratingBreakdown, reviews, completedSwaps, initialIsBlocked] =
    await Promise.all([
      getProfileById(supabase, profileId),
      getProfileListings(supabase, profileId),
      getProfileRatingSummary(supabase, profileId),
      getRatingBreakdown(supabase, profileId),
      listRatingsForProfile(supabase, profileId),
      getCompletedSwapCount(supabase, profileId),
      viewerId && !isOwnProfile ? isBlocked(supabase, viewerId, profileId) : Promise.resolve(false),
    ]);

  if (!profile && !isOwnProfile) {
    notFound();
  }

  const [wishlist, wishlistedIds] = await Promise.all([
    isOwnProfile ? getWishlist(supabase, profileId) : Promise.resolve(null),
    viewerId && !isOwnProfile ? getWishlistedListingIds(supabase, viewerId) : Promise.resolve(new Set<string>()),
  ]);

  const gamification = await getGamificationProfile(supabase, profileId);
  const gamificationBadges = gamification ? await getUserBadges(supabase, gamification.id) : [];

  const displayName = profile?.fullName || profile?.username || fallbackUsername;
  const username = profile?.username ?? fallbackUsername;
  const memberSince = formatMemberSince(profile?.createdAt ?? new Date().toISOString());
  const badges = computeBadges({ completedSwaps, ratingSummary });

  const fallbackProfile: Profile = {
    id: profileId,
    username: fallbackUsername,
    fullName: null,
    avatarUrl: null,
    bio: null,
    location: null,
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
  };

  return (
    <div className="container py-10">
      <ProfileHeader
        profile={profile ?? fallbackProfile}
        displayName={displayName}
        username={username}
        ratingSummary={ratingSummary}
        activeListingsCount={listings.active.length}
        completedSwaps={completedSwaps}
        badges={badges}
        memberSince={memberSince}
        gamification={gamification}
        gamificationBadges={gamificationBadges}
        isOwnProfile={isOwnProfile}
        action={
          isOwnProfile ? (
            <EditProfileDialog profile={profile} userId={profileId} fallbackUsername={fallbackUsername} />
          ) : viewerId ? (
            <ProfileActionsMenu
              viewerId={viewerId}
              profileId={profileId}
              profileUsername={username}
              initialIsBlocked={initialIsBlocked}
            />
          ) : undefined
        }
      />

      {!profile && isOwnProfile && (
        <p className="mb-6 -mt-4 max-w-xl text-sm text-muted-foreground">
          Your profile hasn&apos;t been fully set up yet — add a username and bio to help others get to know you.
        </p>
      )}

      <ProfileTabsSection
        isOwnProfile={isOwnProfile}
        activeListings={listings.active}
        swappedListings={listings.swapped}
        wishlist={wishlist}
        wishlistedIds={wishlistedIds}
        reviews={reviews}
        ratingBreakdown={ratingBreakdown}
        ratingSummary={ratingSummary}
        currentUserId={viewerId}
      />
    </div>
  );
}
