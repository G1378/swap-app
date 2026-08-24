"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MemberCard } from "@/components/member-card";
import type { Profile } from "@/types";

export function MemberSearchGrid({ profiles }: { profiles: Profile[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        (p.fullName?.toLowerCase().includes(q) ?? false) ||
        (p.location?.toLowerCase().includes(q) ?? false)
    );
  }, [profiles, query]);

  return (
    <div>
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, username, or location"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
          <Users className="h-8 w-8" />
          <p className="font-medium">No swappers found.</p>
          <p className="text-sm">Try a different search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((profile) => (
            <MemberCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
