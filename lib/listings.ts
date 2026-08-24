import type { SupabaseClient } from "@supabase/supabase-js";
import { mapProfileRow } from "@/lib/mappers";
import type { Listing, Profile } from "@/types";

// Shown when the `listings` table is empty or not yet created, so Discover
// still demonstrates the intended UI during early development.
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

interface GetAvailableListingsOptions {
  /** Case-insensitive exact category match. Omit for all categories. */
  category?: string;
  /** Owner ids to exclude — used to hide blocked users' listings. */
  excludeOwnerIds?: Set<string>;
}

export async function getAvailableListings(
  supabase: SupabaseClient,
  options: GetAvailableListingsOptions = {}
): Promise<Listing[]> {
  let query = supabase
    .from("listings")
    .select("*")
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (options.category) {
    query = query.ilike("category", options.category);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    const mock = options.category
      ? MOCK_LISTINGS.filter((l) => l.category.toLowerCase() === options.category!.toLowerCase())
      : MOCK_LISTINGS;
    return options.excludeOwnerIds ? mock.filter((l) => !options.excludeOwnerIds!.has(l.ownerId)) : mock;
  }

  // Maps snake_case DB columns to the camelCase Listing type.
  const mapped: Listing[] = data.map((row: Record<string, unknown>) => ({
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

  return options.excludeOwnerIds ? mapped.filter((l) => !options.excludeOwnerIds!.has(l.ownerId)) : mapped;
}

/** Owner username + name for each listing's byline, keyed by ownerId.
 * Mock listings ("mock" ownerId) simply won't have an entry. */
export async function getOwnersByListingOwnerId(
  supabase: SupabaseClient,
  listings: Listing[]
): Promise<Record<string, Pick<Profile, "username" | "fullName">>> {
  const ownerIds = Array.from(new Set(listings.map((l) => l.ownerId))).filter((id) => id !== "mock");
  if (ownerIds.length === 0) return {};

  const { data } = await supabase.from("profiles").select("*").in("id", ownerIds);

  const result: Record<string, Pick<Profile, "username" | "fullName">> = {};
  for (const row of data ?? []) {
    const profile = mapProfileRow(row);
    result[profile.id] = { username: profile.username, fullName: profile.fullName };
  }
  return result;
}
