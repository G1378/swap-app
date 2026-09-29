import type { Category, CategoryPathEntry } from "@/types/taxonomy";

/**
 * The full category tree.
 *
 * The five `featured` top-level categories are the platform's launch
 * niches (see project plan: gaming, LEGO, camera equipment, musical
 * instruments, PC components) — categories where swapping is already a
 * common behaviour. They're surfaced as quick-pick chips at the root of
 * the picker. The rest of the tree gives the marketplace room to expand,
 * covering the same ground as general resale/swap apps (fashion, home,
 * sport, collectibles, and so on).
 */
export const categories: Category[] = [
  {
    id: "gaming",
    name: "Gaming & Consoles",
    featured: true,
    children: [
      {
        id: "gaming-consoles",
        name: "Consoles",
        children: [
          { id: "gaming-consoles-playstation", name: "PlayStation" },
          { id: "gaming-consoles-xbox", name: "Xbox" },
          { id: "gaming-consoles-switch", name: "Nintendo Switch" },
          { id: "gaming-consoles-retro", name: "Retro Consoles" },
        ],
      },
      {
        id: "gaming-games",
        name: "Games",
        children: [
          { id: "gaming-games-playstation", name: "PlayStation Games" },
          { id: "gaming-games-xbox", name: "Xbox Games" },
          { id: "gaming-games-nintendo", name: "Nintendo Games" },
          { id: "gaming-games-pc", name: "PC Games" },
        ],
      },
      { id: "gaming-controllers", name: "Controllers & Accessories" },
      { id: "gaming-vr", name: "VR Headsets" },
      { id: "gaming-furniture", name: "Gaming Chairs & Desks" },
    ],
  },
  {
    id: "pc-components",
    name: "PC Components & Hardware",
    featured: true,
    children: [
      { id: "pc-gpu", name: "Graphics Cards" },
      { id: "pc-cpu", name: "Processors (CPUs)" },
      { id: "pc-motherboards", name: "Motherboards" },
      { id: "pc-ram", name: "Memory (RAM)" },
      { id: "pc-storage", name: "Storage (SSD & HDD)" },
      { id: "pc-psu", name: "Power Supplies" },
      { id: "pc-cases", name: "Cases & Cooling" },
      {
        id: "pc-peripherals",
        name: "Peripherals",
        children: [
          { id: "pc-peripherals-keyboards", name: "Keyboards" },
          { id: "pc-peripherals-mice", name: "Mice" },
          { id: "pc-peripherals-monitors", name: "Monitors" },
          { id: "pc-peripherals-headsets", name: "Headsets" },
        ],
      },
    ],
  },
  {
    id: "cameras",
    name: "Cameras & Photography",
    featured: true,
    children: [
      { id: "cameras-mirrorless", name: "Mirrorless Cameras" },
      { id: "cameras-dslr", name: "DSLR Cameras" },
      { id: "cameras-film", name: "Film Cameras" },
      { id: "cameras-action", name: "Action Cameras" },
      { id: "cameras-lenses", name: "Lenses" },
      { id: "cameras-drones", name: "Drones" },
      { id: "cameras-tripods", name: "Tripods & Rigs" },
      { id: "cameras-lighting", name: "Lighting & Studio" },
    ],
  },
  {
    id: "instruments",
    name: "Musical Instruments",
    featured: true,
    children: [
      {
        id: "instruments-guitars",
        name: "Guitars",
        children: [
          { id: "instruments-guitars-electric", name: "Electric Guitars" },
          { id: "instruments-guitars-acoustic", name: "Acoustic Guitars" },
          { id: "instruments-guitars-bass", name: "Bass Guitars" },
        ],
      },
      { id: "instruments-keys", name: "Keyboards & Pianos" },
      { id: "instruments-drums", name: "Drums & Percussion" },
      { id: "instruments-studio", name: "Studio & Recording" },
      { id: "instruments-brass-woodwind", name: "Brass & Woodwind" },
      { id: "instruments-amps-pedals", name: "Amps & Pedals" },
    ],
  },
  {
    id: "lego-toys",
    name: "LEGO & Building Toys",
    featured: true,
    children: [
      { id: "lego-star-wars", name: "LEGO Star Wars" },
      { id: "lego-technic", name: "LEGO Technic" },
      { id: "lego-city", name: "LEGO City" },
      { id: "lego-creator", name: "LEGO Creator" },
      { id: "lego-ideas", name: "LEGO Ideas & Icons" },
      { id: "lego-other", name: "Other Building Sets" },
    ],
  },
  {
    id: "electronics",
    name: "Electronics & Tech",
    children: [
      { id: "electronics-phones", name: "Phones & Smartphones" },
      { id: "electronics-tablets", name: "Tablets" },
      { id: "electronics-laptops", name: "Laptops" },
      { id: "electronics-wearables", name: "Smartwatches & Wearables" },
      { id: "electronics-speakers", name: "Speakers & Audio" },
      { id: "electronics-headphones", name: "Headphones & Earbuds" },
      { id: "electronics-smart-home", name: "Smart Home" },
    ],
  },
  {
    id: "womens-fashion",
    name: "Women's Fashion",
    children: [
      { id: "womens-dresses", name: "Dresses" },
      { id: "womens-tops", name: "Tops & T-Shirts" },
      { id: "womens-jeans-trousers", name: "Jeans & Trousers" },
      { id: "womens-knitwear", name: "Knitwear" },
      { id: "womens-coats", name: "Coats & Jackets" },
      { id: "womens-shoes", name: "Shoes" },
      { id: "womens-activewear", name: "Activewear" },
    ],
  },
  {
    id: "mens-fashion",
    name: "Men's Fashion",
    children: [
      { id: "mens-shirts", name: "T-Shirts & Shirts" },
      { id: "mens-jeans-trousers", name: "Jeans & Trousers" },
      { id: "mens-knitwear", name: "Knitwear" },
      { id: "mens-coats", name: "Coats & Jackets" },
      { id: "mens-shoes", name: "Shoes" },
      { id: "mens-activewear", name: "Activewear" },
      { id: "mens-tailoring", name: "Suits & Tailoring" },
    ],
  },
  {
    id: "kids-baby",
    name: "Kids & Baby",
    children: [
      { id: "kids-baby-clothing", name: "Baby Clothing" },
      { id: "kids-clothing", name: "Kids Clothing" },
      { id: "kids-toys", name: "Toys" },
      { id: "kids-prams-travel", name: "Prams & Travel" },
      { id: "kids-nursery", name: "Nursery" },
    ],
  },
  {
    id: "home-living",
    name: "Home & Living",
    children: [
      { id: "home-furniture", name: "Furniture" },
      { id: "home-kitchenware", name: "Kitchenware" },
      { id: "home-decor", name: "Home Decor" },
      { id: "home-bedding-textiles", name: "Bedding & Textiles" },
      { id: "home-garden-outdoor", name: "Garden & Outdoor" },
    ],
  },
  {
    id: "sports-outdoors",
    name: "Sports & Outdoors",
    children: [
      { id: "sports-cycling", name: "Cycling" },
      { id: "sports-fitness-gym", name: "Fitness & Gym" },
      { id: "sports-camping-hiking", name: "Camping & Hiking" },
      { id: "sports-team-sports", name: "Team Sports" },
      { id: "sports-golf", name: "Golf" },
      { id: "sports-racquet", name: "Racquet Sports" },
    ],
  },
  {
    id: "collectibles-hobbies",
    name: "Collectibles & Hobbies",
    children: [
      { id: "collectibles-trading-cards", name: "Trading Cards" },
      { id: "collectibles-figures-funko", name: "Action Figures & Funko" },
      { id: "collectibles-board-games", name: "Board Games & Puzzles" },
      { id: "collectibles-comics", name: "Comics" },
      { id: "collectibles-coins-stamps", name: "Coins & Stamps" },
      { id: "collectibles-model-kits", name: "Model Kits" },
    ],
  },
  {
    id: "books-media",
    name: "Books, Films & Music",
    children: [
      { id: "books", name: "Books" },
      { id: "media-vinyl", name: "Vinyl Records" },
      { id: "media-cds", name: "CDs" },
      { id: "media-dvd-bluray", name: "DVDs & Blu-ray" },
    ],
  },
  {
    id: "watches-jewellery",
    name: "Watches & Jewellery",
    children: [
      { id: "watches", name: "Watches" },
      { id: "jewellery-necklaces", name: "Necklaces & Pendants" },
      { id: "jewellery-rings", name: "Rings" },
      { id: "jewellery-earrings", name: "Earrings" },
      { id: "jewellery-bracelets", name: "Bracelets" },
    ],
  },
  {
    id: "bags-accessories",
    name: "Bags & Accessories",
    children: [
      { id: "bags-handbags", name: "Handbags" },
      { id: "bags-backpacks", name: "Backpacks" },
      { id: "bags-wallets-purses", name: "Wallets & Purses" },
      { id: "accessories-belts", name: "Belts" },
      { id: "accessories-sunglasses", name: "Sunglasses" },
    ],
  },
];

/** Depth-first flattening of the tree, each entry carrying its ancestor path. */
export function flattenCategories(
  nodes: Category[] = categories,
  parents: Category[] = []
): CategoryPathEntry[] {
  return nodes.flatMap((node) => {
    const path = [...parents, node];
    const entry: CategoryPathEntry = { category: node, path };
    const children = node.children
      ? flattenCategories(node.children, path)
      : [];
    return [entry, ...children];
  });
}

const flatIndex = flattenCategories();

/** Look up a category anywhere in the tree by id, with its ancestor path. */
export function findCategoryPath(id: string): CategoryPathEntry | undefined {
  return flatIndex.find((entry) => entry.category.id === id);
}

/** Case-insensitive search across every category name in the tree. */
export function searchCategories(query: string): CategoryPathEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return flatIndex.filter((entry) =>
    entry.category.name.toLowerCase().includes(q)
  );
}

export function getTopLevelCategory(id: string): Category | undefined {
  const entry = findCategoryPath(id);
  return entry?.path[0];
}

/** Top-level categories where listings need a size (clothing, shoes, kids). */
const SIZED_TOP_LEVEL_IDS = new Set(["womens-fashion", "mens-fashion", "kids-baby"]);

export function categoryUsesSizes(topLevelCategoryId?: string): boolean {
  return topLevelCategoryId ? SIZED_TOP_LEVEL_IDS.has(topLevelCategoryId) : false;
}
