import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/types";

export function MemberCard({ profile }: { profile: Profile }) {
  const displayName = profile.fullName || profile.username;

  return (
    <Link
      href={`/profile/${profile.username}`}
      className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-accent/50"
    >
      <Avatar alt={displayName} fallback={displayName} src={profile.avatarUrl} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
        {profile.location && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {profile.location}
          </p>
        )}
      </div>
    </Link>
  );
}
