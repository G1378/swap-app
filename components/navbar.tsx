import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-rendered navbar. Checks the current Supabase session so it can
 * show "Log in / Sign up" or the user's avatar + profile link.
 */
export async function Navbar() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
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
            <Link href="/profile">
              <Avatar
                alt={user.email ?? "You"}
                fallback={user.email ?? "U"}
                src={user.user_metadata?.avatar_url ?? null}
                size={36}
              />
            </Link>
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
