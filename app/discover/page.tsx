import { createClient } from "@/lib/supabase/server";
import { getAvailableListings, getOwnersByListingOwnerId } from "@/lib/listings";
import { getBlockedEitherDirection } from "@/lib/blocks";
import { LISTING_CATEGORIES } from "@/lib/constants";
import { DiscoverGrid } from "@/components/discover-grid";

export default async function DiscoverPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const blockedIds = user ? await getBlockedEitherDirection(supabase, user.id) : new Set<string>();
  const listings = await getAvailableListings(supabase, { excludeOwnerIds: blockedIds });
  const owners = await getOwnersByListingOwnerId(supabase, listings);

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
        <p className="mt-1 text-muted-foreground">Browse items available to swap right now.</p>
      </div>
      <DiscoverGrid
        listings={listings}
        owners={owners}
        categories={[...LISTING_CATEGORIES]}
        activeCategory={null}
      />
    </div>
  );
}
