import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightLeft, MapPin, Star, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfileRatingSummary } from "@/lib/ratings";
import { listSwapRequestsForUser } from "@/lib/swap-requests";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OwnedListingCard } from "@/components/owned-listing-card";
import type { Listing, Profile } from "@/types";

async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Record<string, unknown>>();

  if (!data) return null;

  return {
    id: data.id as string,
    username: data.username as string,
    fullName: (data.full_name as string) ?? null,
    avatarUrl: (data.avatar_url as string) ?? null,
    bio: (data.bio as string) ?? null,
    location: (data.location as string) ?? null,
    createdAt: data.created_at as string,
  };
}

async function getMyListings(userId: string): Promise<Listing[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    ownerId: row.owner_id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    condition: row.condition as string,
    imageUrl: (row.image_url as string) ?? null,
    wantedInReturn: (row.wanted_in_return as string) ?? null,
    status: row.status as Listing["status"],
    createdAt: row.created_at as string,
  }));
}

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, listings, ratingSummary, swapRequests] = await Promise.all([
    getProfile(user.id),
    getMyListings(user.id),
    getProfileRatingSummary(supabase, user.id),
    listSwapRequestsForUser(supabase, user.id),
  ]);

  const completedSwaps = swapRequests.filter((sr) => sr.status === "completed").length;

  const displayName = profile?.fullName || profile?.username || user.email?.split("@")[0] || "You";
  const username = profile?.username ?? user.email?.split("@")[0] ?? "user";

  return (
    <div className="container py-10">
      {/* Profile header */}
      <div className="mb-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar alt={displayName} fallback={displayName} src={profile?.avatarUrl} size={88} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">@{username}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {profile?.location && (
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
              <Package className="h-3.5 w-3.5" /> {listings.length} listing
              {listings.length === 1 ? "" : "s"}
            </span>
            <Link href="/swaps" className="flex items-center gap-1 hover:text-foreground hover:underline">
              <ArrowRightLeft className="h-3.5 w-3.5" /> {completedSwaps} completed swap
              {completedSwaps === 1 ? "" : "s"}
            </Link>
          </div>
          {profile?.bio && <p className="mt-3 max-w-xl text-sm">{profile.bio}</p>}
          {!profile && (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Your profile hasn&apos;t been fully set up yet — add a username and bio to help
              others get to know you.
            </p>
          )}
        </div>
        <Button variant="outline">Edit profile</Button>
      </div>

      {/* Listings */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your listings</h2>
          <Link href="/listings/new">
            <Button size="sm">+ New listing</Button>
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
            <Package className="h-8 w-8" />
            <p className="font-medium">You haven&apos;t listed anything yet.</p>
            <p className="text-sm">Create your first listing to start getting swap matches.</p>
            <Link href="/listings/new" className="mt-2">
              <Button size="sm">+ New listing</Button>
            </Link>
            <Badge variant="outline" className="mt-2">
              Tip: clear photos get 3x more swap requests
            </Badge>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => (
              <OwnedListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
