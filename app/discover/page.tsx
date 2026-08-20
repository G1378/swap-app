import { createClient } from "@/lib/supabase/server";
import { DiscoverGrid } from "@/components/discover-grid";
import type { Listing } from "@/types";

// Shown when the `listings` table is empty or not yet created, so the
// page still demonstrates the intended UI during early development.
const MOCK_LISTINGS: Listing[] = [
  {
    id: "mock-1",
    ownerId: "mock",
    title: "Nintendo Switch OLED",
    description: "Barely used, comes with dock and two Joy-Cons. Looking for a Steam Deck.",
    category: "Gaming",
    condition: "Like new",
    imageUrl: null,
    wantedInReturn: "Steam Deck",
    status: "available",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    ownerId: "mock",
    title: "LEGO Star Wars Millennium Falcon",
    description: "Complete set, built once and displayed. Open to LEGO City sets.",
    category: "LEGO",
    condition: "Good",
    imageUrl: null,
    wantedInReturn: "LEGO City sets",
    status: "available",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-3",
    ownerId: "mock",
    title: "Canon 50mm f/1.8 Lens",
    description: "Great condition prime lens. Want a wide-angle lens instead.",
    category: "Camera Equipment",
    condition: "Excellent",
    imageUrl: null,
    wantedInReturn: "Wide-angle lens",
    status: "available",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-4",
    ownerId: "mock",
    title: "Fender Squier Stratocaster",
    description: "Beginner-friendly electric guitar. Looking to swap for an acoustic.",
    category: "Musical Instruments",
    condition: "Good",
    imageUrl: null,
    wantedInReturn: "Acoustic guitar",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "mock-5",
    ownerId: "mock",
    title: "RTX 3070 Graphics Card",
    description: "Upgrading my rig, this card runs great. Want an RTX 4070 or similar.",
    category: "PC Components",
    condition: "Good",
    imageUrl: null,
    wantedInReturn: "RTX 4070",
    status: "available",
    createdAt: new Date().toISOString(),
  },
];

async function getListings(): Promise<Listing[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return MOCK_LISTINGS;
  }

  // Maps snake_case DB columns to the camelCase Listing type.
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

export default async function DiscoverPage() {
  const listings = await getListings();

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Discover</h1>
        <p className="mt-1 text-muted-foreground">
          Browse items available to swap right now.
        </p>
      </div>
      <DiscoverGrid listings={listings} />
    </div>
  );
}
