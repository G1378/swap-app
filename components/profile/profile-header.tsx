import type { ReactNode } from "react";
import { ArrowRightLeft, CalendarDays, MapPin, Package, Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BadgePill } from "@/components/profile/badge-pill";
import { GamificationPanel } from "@/components/gamification/gamification-panel";
import type { GamificationProfile, Profile, ProfileBadge, RatingSummary, UserBadgeWithBadge } from "@/types";

interface ProfileHeaderProps {
  profile: Profile;
  displayName: string;
  username: string;
  ratingSummary: RatingSummary;
  activeListingsCount: number;
  completedSwaps: number;
  badges: ProfileBadge[];
  memberSince: string;
  /** Null only in the moment before a new profile's gamification row has
   * been provisioned — the panel just doesn't render in that case. */
  gamification: GamificationProfile | null;
  gamificationBadges: UserBadgeWithBadge[];
  isOwnProfile: boolean;
  action?: ReactNode;
}

export function ProfileHeader({
  profile,
  displayName,
  username,
  ratingSummary,
  activeListingsCount,
  completedSwaps,
  badges,
  memberSince,
  gamification,
  gamificationBadges,
  isOwnProfile,
  action,
}: ProfileHeaderProps) {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card">
      {/* Banner */}
      <div className="h-28 bg-gradient-to-br from-primary via-primary to-accent-foreground sm:h-36" />

      <div className="px-5 pb-6 sm:px-8">
        <div className="-mt-12 flex flex-col items-start gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <Avatar
            alt={displayName}
            fallback={displayName}
            src={profile.avatarUrl}
            size={96}
            className="border-4 border-card shadow-sm"
          />
          {action && <div className="sm:mb-2">{action}</div>}
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">@{username}</p>

          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <BadgePill key={badge.id} badge={badge} />
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              {ratingSummary.count > 0
                ? `${ratingSummary.average!.toFixed(1)} (${ratingSummary.count} rating${ratingSummary.count === 1 ? "" : "s"})`
                : "No ratings yet"}
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" /> {activeListingsCount} listing{activeListingsCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1">
              <ArrowRightLeft className="h-3.5 w-3.5" /> {completedSwaps} completed swap
              {completedSwaps === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Joined {memberSince}
            </span>
          </div>

          {profile.bio && <p className="mt-3 max-w-2xl text-sm">{profile.bio}</p>}

          {gamification && (
            <GamificationPanel gamification={gamification} badges={gamificationBadges} isOwnProfile={isOwnProfile} />
          )}
        </div>
      </div>
    </div>
  );
}
