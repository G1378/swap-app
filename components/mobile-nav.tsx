"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Store, User, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isLoggedIn: boolean;
  /** Passed down from the navbar's server-side fetch so this doesn't need
   * its own realtime subscription — a static count as of page load, same
   * tradeoff the desktop NotificationBell's initial render makes. */
  unreadCount: number;
}

interface Tab {
  key: string;
  label: string;
  href: string;
  icon: typeof Home;
  /** Whether the current pathname counts as "on" this tab. */
  isActive: (pathname: string) => boolean;
  badge?: number;
}

/**
 * Bottom tab bar, mobile only (`sm:hidden`) — the primary way to navigate
 * the app on a phone. The desktop `<nav>` in Navbar covers `sm:` and up;
 * below that breakpoint this is the only navigation surface, so every
 * top-level destination needs a tab here.
 *
 * Logged-out visitors still get the bar — Discover is public — but
 * shop/create/swaps/profile all route to /login instead of their signed-in
 * destination, mirroring the same gate DiscoverReel already uses when a
 * logged-out user tries to swipe right. Search isn't a tab here on
 * purpose: it lives as an icon on the Discover feed itself (top right),
 * since it's a feed-scoped action rather than a top-level destination.
 */
export function MobileNav({ isLoggedIn, unreadCount }: MobileNavProps) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    {
      key: "home",
      label: "Home",
      href: "/discover",
      icon: Home,
      isActive: (p) => p === "/discover",
    },
    {
      key: "shop",
      label: "Shop",
      href: isLoggedIn ? "/shop" : "/login",
      icon: Store,
      isActive: (p) => p.startsWith("/shop"),
    },
    {
      key: "create",
      label: "List item",
      href: isLoggedIn ? "/listings/new" : "/login",
      icon: Plus,
      isActive: (p) => p === "/listings/new",
    },
    {
      key: "swaps",
      label: "Swaps",
      href: isLoggedIn ? "/swaps" : "/login",
      icon: ArrowRightLeft,
      isActive: (p) => p.startsWith("/swaps"),
      badge: unreadCount,
    },
    {
      key: "profile",
      label: "Profile",
      href: isLoggedIn ? "/profile" : "/login",
      icon: User,
      isActive: (p) => p.startsWith("/profile"),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-end justify-around border-t border-border bg-background/95 pb-2 backdrop-blur sm:hidden"
    >
      {tabs.map((tab) => {
        const active = tab.isActive(pathname);
        const Icon = tab.icon;

        if (tab.key === "create") {
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-label={tab.label}
              className="flex flex-col items-center gap-1"
            >
              <span className="-mt-6 flex h-11 w-11 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className="relative flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium"
          >
            <Icon
              className={cn(
                "h-5 w-5",
                active ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className={active ? "text-primary" : "text-muted-foreground"}>
              {tab.label}
            </span>
            {!!tab.badge && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-0 h-2 w-2 rounded-full bg-primary"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
