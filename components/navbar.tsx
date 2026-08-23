import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/profiles";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { NotificationBell } from "@/components/notification-bell";
import { UserMenu } from "@/components/user-menu";

export async function Navbar() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profile, unreadCount] = user
    ? await Promise.all([getProfileById(supabase, user.id), getUnreadNotificationCount(supabase, user.id)])
    : [null, 0];

  const displayName = profile?.fullName || profile?.username || user?.email || "You";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Repeat2 className="h-4 w-4" />
          </span>
          SwapApp
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/discover" className="text-muted-foreground hover:text-foreground">
            Discover
          </Link>
          {user && (
            <>
              <Link href="/swaps" className="text-muted-foreground hover:text-foreground">
                My Swaps
              </Link>
              <Link href="/profile" className="text-muted-foreground hover:text-foreground">
                My Profile
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell profileId={user.id} initialUnreadCount={unreadCount} />
              <UserMenu displayName={displayName} avatarUrl={profile?.avatarUrl ?? null} />
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
