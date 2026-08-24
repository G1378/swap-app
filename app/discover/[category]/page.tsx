import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAvailableListings, getOwnersByListingOwnerId } from "@/lib/listings";
import { getBlockedEitherDirection } from "@/lib/blocks";
import { LISTING_CATEGORIES } from "@/lib/constants";
import { DiscoverGrid } from "@/components/discover-grid";

interface CategoryPageProps {
  params: { category: string };
}

export function generateStaticParams() {
  return LISTING_CATEGORIES.map((category) => ({ category }));
}

export default async function CategoryDiscoverPage({ params }: CategoryPageProps) {
  const category = decodeURIComponent(params.category);
  const matchedCategory = LISTING_CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase());

  if (!matchedCategory) {
    notFound();
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const blockedIds = user ? await getBlockedEitherDirection(supabase, user.id) : new Set<string>();
  const listings = await getAvailableListings(supabase, { category: matchedCategory, excludeOwnerIds: blockedIds });
  const owners = await getOwnersByListingOwnerId(supabase, listings);

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{matchedCategory}</h1>
        <p className="mt-1 text-muted-foreground">Browse {matchedCategory.toLowerCase()} items available to swap.</p>
      </div>
      <DiscoverGrid
        listings={listings}
        owners={owners}
        categories={[...LISTING_CATEGORIES]}
        activeCategory={matchedCategory}
      />
    </div>
  );
}
