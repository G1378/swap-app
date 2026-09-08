"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PackageOpen, Search, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listProfiles } from "@/lib/profiles";
import { getBlockedEitherDirection } from "@/lib/blocks";
import { Avatar } from "@/components/ui/avatar";
import type { Listing, Profile } from "@/types";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  /** The reel's full listing set — already the complete "available"
   * result set (see app/discover/page.tsx), so filtering it client-side
   * is a real search, not just a search of whatever's currently on
   * screen. */
  listings: Listing[];
  currentUserId: string | null;
  /** Jumps the reel to this card instead of navigating to a listing page —
   * search is meant to stay inside the feed, not send you somewhere else. */
  onSelectListing: (listingId: string) => void;
}

/**
 * Translucent panel over the Discover reel (not a route) — see
 * DiscoverReel, which renders this absolutely positioned within its own
 * container so it's scoped to the feed, not a page-wide modal.
 *
 * Two modes based on the query text, no separate toggle: plain text
 * searches listings by title; a leading "@" switches to searching
 * members by username/name, mirroring the same convention as mentions
 * elsewhere. No category filters here on purpose — this is meant to be
 * fast free-text search, not another place to browse by category (that
 * still exists at /discover/[category] for anyone who wants it).
 */
export function SearchOverlay({
  open,
  onClose,
  listings,
  currentUserId,
  onSelectListing,
}: SearchOverlayProps) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Profile[] | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);

  const isMemberMode = query.trim().startsWith("@");

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Lazily loads the member directory the first time "@" mode is entered
  // (once per mount — most searches here will be for listings, so there's
  // no reason to fetch every profile on every Discover visit).
  useEffect(() => {
    if (!isMemberMode || members !== null || loadingMembers) return;
    setLoadingMembers(true);
    Promise.all([
      listProfiles(supabase),
      currentUserId
        ? getBlockedEitherDirection(supabase, currentUserId)
        : Promise.resolve(new Set<string>()),
    ]).then(([profiles, blocked]) => {
      setMembers(profiles);
      setBlockedIds(blocked);
      setLoadingMembers(false);
    });
  }, [isMemberMode, members, loadingMembers, supabase, currentUserId]);

  const listingResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (isMemberMode || !q) return [];
    return listings
      .filter((l) => l.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [listings, query, isMemberMode]);

  const memberResults = useMemo(() => {
    if (!isMemberMode || !members) return [];
    const q = query.trim().slice(1).toLowerCase();
    return members
      .filter((p) => p.id !== currentUserId && !blockedIds.has(p.id))
      .filter(
        (p) =>
          !q ||
          p.username.toLowerCase().includes(q) ||
          (p.fullName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 30);
  }, [members, query, isMemberMode, currentUserId, blockedIds]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-neutral-950/90 backdrop-blur-xl">
      <div className="flex items-center gap-2 p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings, or @ for members"
            className="w-full rounded-full border border-white/20 bg-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {!query.trim() && (
          <p className="pt-10 text-center text-sm text-white/50">
            Search listings by title, or start with @ to find members.
          </p>
        )}

        {isMemberMode && loadingMembers && (
          <p className="pt-10 text-center text-sm text-white/50">
            Loading members…
          </p>
        )}

        {isMemberMode &&
          !loadingMembers &&
          query.trim().length > 1 &&
          memberResults.length === 0 && (
            <div className="flex flex-col items-center gap-2 pt-10 text-center text-white/50">
              <Users className="h-6 w-6" />
              <p className="text-sm">No members found.</p>
            </div>
          )}

        {isMemberMode &&
          memberResults.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => {
                router.push(`/profile/${member.username}`);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/10"
            >
              <Avatar
                src={member.avatarUrl}
                alt={member.username}
                fallback={member.fullName || member.username}
                size={36}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {member.fullName || member.username}
                </p>
                <p className="truncate text-xs text-white/50">
                  @{member.username}
                </p>
              </div>
            </button>
          ))}

        {!isMemberMode && query.trim() && listingResults.length === 0 && (
          <div className="flex flex-col items-center gap-2 pt-10 text-center text-white/50">
            <PackageOpen className="h-6 w-6" />
            <p className="text-sm">No listings found.</p>
          </div>
        )}

        {!isMemberMode &&
          listingResults.map((listing) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => {
                onSelectListing(listing.id);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/10"
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white/10">
                {listing.imageUrl ? (
                  <Image
                    src={listing.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                ) : (
                  <PackageOpen className="absolute inset-0 m-auto h-4 w-4 text-white/40" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {listing.title}
                </p>
                <p className="truncate text-xs text-white/50">
                  {listing.category}
                </p>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
