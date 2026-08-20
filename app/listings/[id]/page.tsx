import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Package, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { mapListingRow, mapProfileRow } from "@/lib/mappers";
import { findActiveSwapRequest } from "@/lib/swap-requests";
import { getProfileRatingSummary } from "@/lib/ratings";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ListingSwapAction } from "@/components/listing-swap-action";
import type { Listing } from "@/types";

interface ListingDetailPageProps {
  params: { id: string };
}

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const supabase = createClient();

  const { data: listingRow } = await supabase.from("listings").select("*").eq("id", params.id).maybeSingle();

  if (!listingRow) {
    notFound();
  }

  const listing = mapListingRow(listingRow);

  const [{ data: ownerRow }, ratingSummary, {
    data: { user },
  }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", listing.ownerId).maybeSingle(),
    getProfileRatingSummary(supabase, listing.ownerId),
    supabase.auth.getUser(),
  ]);

  const owner = ownerRow ? mapProfileRow(ownerRow) : null;
  const isOwner = user?.id === listing.ownerId;

  let myListings: Listing[] = [];
  let activeSwapRequestId: string | null = null;

  if (user && !isOwner) {
    const [{ data: myListingRows }, activeRequest] = await Promise.all([
      supabase
        .from("listings")
        .select("*")
        .eq("owner_id", user.id)
        .eq("status", "available")
        .order("created_at", { ascending: false }),
      findActiveSwapRequest(supabase, listing.id, user.id),
    ]);

    myListings = (myListingRows ?? []).map(mapListingRow);
    activeSwapRequestId = activeRequest?.id ?? null;
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Photo */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted">
          {listing.imageUrl ? (
            <Image src={listing.imageUrl} alt={listing.title} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{listing.category}</Badge>
              <Badge variant="outline">{listing.condition}</Badge>
              {listing.status !== "available" && (
                <Badge variant="secondary">{listing.status === "pending" ? "Pending swap" : "Swapped"}</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1>
          </div>

          <p className="whitespace-pre-line text-sm text-muted-foreground">{listing.description}</p>

          {listing.wantedInReturn && (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm">
              <span className="font-medium">Looking for:</span> {listing.wantedInReturn}
            </div>
          )}

          {/* Owner */}
          {owner && (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Avatar alt={owner.fullName || owner.username} fallback={owner.fullName || owner.username} src={owner.avatarUrl} size={44} />
              <div className="flex-1">
                <p className="text-sm font-medium">{owner.fullName || owner.username}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {owner.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {owner.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {ratingSummary.count > 0
                      ? `${ratingSummary.average!.toFixed(1)} (${ratingSummary.count} rating${ratingSummary.count === 1 ? "" : "s"})`
                      : "No ratings yet"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Swap action */}
          <div className="mt-2">
            {isOwner ? (
              <p className="text-sm text-muted-foreground">This is your listing.</p>
            ) : activeSwapRequestId ? (
              <Link href={`/swaps/${activeSwapRequestId}`}>
                <Badge variant="accent" className="cursor-pointer px-3 py-1.5 text-sm">
                  You already requested this — view swap
                </Badge>
              </Link>
            ) : (
              <ListingSwapAction
                listing={listing}
                currentUserId={user?.id ?? null}
                myListings={myListings}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
