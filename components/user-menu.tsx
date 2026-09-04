"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, LogOut, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";

interface UserMenuProps {
  displayName: string;
  avatarUrl: string | null;
}

export function UserMenu({ displayName, avatarUrl }: UserMenuProps) {
  const supabase = createClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar alt={displayName} fallback={displayName} src={avatarUrl} size={36} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">{displayName}</p>
          </div>
          <nav className="flex flex-col py-1">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
            >
              <UserIcon className="h-4 w-4" /> My profile
            </Link>
            <Link
              href="/swaps"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent sm:hidden"
            >
              <ArrowRightLeft className="h-4 w-4" /> My swaps
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="flex items-center gap-2 px-4 py-2 text-left text-sm text-destructive hover:bg-accent disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" /> {signingOut ? "Logging out..." : "Log out"}
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
