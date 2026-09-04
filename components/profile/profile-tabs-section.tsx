"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { OwnedListingCard } from "@/components/owned-listing-card";
import { WishlistableListingCard } from "@/components/wishlistable-listing-card";
import { ReviewCard } from "@/components/profile/review-card";
import { RatingBreakdown } from "@/components/profile/rating-breakdown";
import type {
  Listing,
  RatingBreakdown as RatingBreakdownData,
  RatingSummary,
  RatingWithAuthor,
  WishlistEntry,
} from "@/types";

interface ProfileTabsSectionProps {
  isOwnProfile: boolean;
  activeListings: Listing[];
  swappedListings: Listing[];
  /** null when the tab shouldn't render at all (viewing someone else's profile). */
  wishlist: WishlistEntry[] | null;
  /** Listing ids the *viewer* has already saved — used to pre-check hearts on someone else's listings. */
  wishlistedIds: Set<string>;
  reviews: RatingWithAuthor[];
  ratingBreakdown: RatingBreakdownData;
  ratingSummary: RatingSummary;
  currentUserId: string | null;
}

export function ProfileTabsSection({
  isOwnProfile,
  activeListings,
  swappedListings,
  wishlist,
  wishlistedIds,
  reviews,
  ratingBreakdown,
  ratingSummary,
  currentUserId,
}: ProfileTabsSectionProps) {
  return (
    <Tabs defaultValue="listings">
      <TabsList>
        <TabsTrigger value="listings">Listings ({activeListings.length})</TabsTrigger>
        <TabsTrigger value="swapped">Swapped ({swappedListings.length})</TabsTrigger>
        {wishlist && <TabsTrigger value="wishlist">Wishlist ({wishlist.length})</TabsTrigger>}
        <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="listings">
        {isOwnProfile && (
          <div className="mb-4 flex justify-end">
            <Link href="/listings/new">
              <Button size="sm">+ New listing</Button>
            </Link>
          </div>
        )}
        {activeListings.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title={isOwnProfile ? "You haven't listed anything yet." : "No active listings."}
            subtitle={isOwnProfile ? "Create your first listing to start getting swap matches." : undefined}
          />
        ) : (
          <ListingGrid>
            {activeListings.map((listing) =>
              isOwnProfile ? (
                <OwnedListingCard key={listing.id} listing={listing} />
              ) : (
                <WishlistableListingCard
                  key={listing.id}
                  listing={listing}
                  userId={currentUserId}
                  initialSaved={wishlistedIds.has(listing.id)}
                />
              )
            )}
          </ListingGrid>
        )}
      </TabsContent>

      <TabsContent value="swapped">
        {swappedListings.length === 0 ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="No completed swaps yet." />
        ) : (
          <ListingGrid>
            {swappedListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ListingGrid>
        )}
      </TabsContent>

      {wishlist && (
        <TabsContent value="wishlist">
          {wishlist.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8" />}
              title="Nothing saved yet."
              subtitle="Tap the heart on any listing to save it here."
            />
          ) : (
            <ListingGrid>
              {wishlist.map(
                (entry) =>
                  entry.listing && (
                    <WishlistableListingCard
                      key={entry.id}
                      listing={entry.listing}
                      userId={currentUserId}
                      initialSaved
                    />
                  )
              )}
            </ListingGrid>
          )}
        </TabsContent>
      )}

      <TabsContent value="reviews">
        <RatingBreakdown breakdown={ratingBreakdown} summary={ratingSummary} />
        {reviews.length > 0 && (
          <div className="flex flex-col gap-3">
            {reviews.map((rating) => (
              <ReviewCard key={rating.id} rating={rating} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function ListingGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
      {icon}
      <p className="font-medium">{title}</p>
      {subtitle && <p className="text-sm">{subtitle}</p>}
    </div>
  );
}
