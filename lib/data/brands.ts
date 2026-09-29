import type { Brand } from "@/types/taxonomy";

/**
 * Brand catalogue. Each brand lists the top-level category ids it
 * commonly appears under (see categories.ts) so the publish flow can
 * narrow ~130 brands down to the handful relevant to what someone is
 * actually listing, the way Vinted and eBay's item-specifics do.
 */
export const brands: Brand[] = [
  // --- Gaming -------------------------------------------------------
  { id: "nintendo", name: "Nintendo", categories: ["gaming"], popular: true },
  { id: "sony", name: "Sony", categories: ["gaming", "cameras", "electronics"], popular: true },
  { id: "microsoft", name: "Microsoft", categories: ["gaming", "electronics", "pc-components"], popular: true },
  { id: "valve", name: "Valve", categories: ["gaming"] },
  { id: "razer", name: "Razer", categories: ["gaming", "pc-components"], popular: true },
  { id: "logitech", name: "Logitech", categories: ["gaming", "pc-components", "electronics"], popular: true },
  { id: "steelseries", name: "SteelSeries", categories: ["gaming", "pc-components"] },
  { id: "hyperx", name: "HyperX", categories: ["gaming", "pc-components"] },
  { id: "turtle-beach", name: "Turtle Beach", categories: ["gaming"] },
  { id: "8bitdo", name: "8BitDo", categories: ["gaming"] },
  { id: "sega", name: "Sega", categories: ["gaming", "collectibles-hobbies"] },
  { id: "atari", name: "Atari", categories: ["gaming", "collectibles-hobbies"] },
  { id: "elgato", name: "Elgato", categories: ["gaming", "pc-components"] },

  // --- PC components --------------------------------------------------
  { id: "intel", name: "Intel", categories: ["pc-components"], popular: true },
  { id: "amd", name: "AMD", categories: ["pc-components"], popular: true },
  { id: "nvidia", name: "NVIDIA", categories: ["pc-components"], popular: true },
  { id: "asus", name: "ASUS", categories: ["pc-components", "electronics"], popular: true },
  { id: "asus-rog", name: "ASUS ROG", categories: ["pc-components", "gaming"] },
  { id: "msi", name: "MSI", categories: ["pc-components", "electronics"], popular: true },
  { id: "gigabyte", name: "Gigabyte", categories: ["pc-components"] },
  { id: "asrock", name: "ASRock", categories: ["pc-components"] },
  { id: "corsair", name: "Corsair", categories: ["pc-components", "gaming"], popular: true },
  { id: "nzxt", name: "NZXT", categories: ["pc-components"] },
  { id: "cooler-master", name: "Cooler Master", categories: ["pc-components"] },
  { id: "evga", name: "EVGA", categories: ["pc-components"] },
  { id: "kingston", name: "Kingston", categories: ["pc-components"] },
  { id: "crucial", name: "Crucial", categories: ["pc-components"] },
  { id: "seagate", name: "Seagate", categories: ["pc-components"] },
  { id: "western-digital", name: "Western Digital", categories: ["pc-components"] },
  { id: "be-quiet", name: "be quiet!", categories: ["pc-components"] },
  { id: "fractal-design", name: "Fractal Design", categories: ["pc-components"] },
  { id: "thermaltake", name: "Thermaltake", categories: ["pc-components"] },
  { id: "benq", name: "BenQ", categories: ["pc-components", "electronics"] },
  { id: "lg", name: "LG", categories: ["pc-components", "electronics"], popular: true },
  { id: "dell", name: "Dell", categories: ["pc-components", "electronics"] },

  // --- Cameras --------------------------------------------------------
  { id: "canon", name: "Canon", categories: ["cameras"], popular: true },
  { id: "nikon", name: "Nikon", categories: ["cameras"], popular: true },
  { id: "fujifilm", name: "Fujifilm", categories: ["cameras"], popular: true },
  { id: "panasonic", name: "Panasonic", categories: ["cameras", "electronics"], popular: true },
  { id: "om-system", name: "OM System (Olympus)", categories: ["cameras"] },
  { id: "leica", name: "Leica", categories: ["cameras"], popular: true },
  { id: "gopro", name: "GoPro", categories: ["cameras"], popular: true },
  { id: "dji", name: "DJI", categories: ["cameras"], popular: true },
  { id: "sigma", name: "Sigma", categories: ["cameras"] },
  { id: "tamron", name: "Tamron", categories: ["cameras"] },
  { id: "hasselblad", name: "Hasselblad", categories: ["cameras"] },
  { id: "polaroid", name: "Polaroid", categories: ["cameras"] },
  { id: "ricoh", name: "Ricoh", categories: ["cameras"] },
  { id: "godox", name: "Godox", categories: ["cameras"] },
  { id: "manfrotto", name: "Manfrotto", categories: ["cameras"] },

  // --- Musical instruments ---------------------------------------------
  { id: "fender", name: "Fender", categories: ["instruments"], popular: true },
  { id: "gibson", name: "Gibson", categories: ["instruments"], popular: true },
  { id: "yamaha", name: "Yamaha", categories: ["instruments", "electronics"], popular: true },
  { id: "roland", name: "Roland", categories: ["instruments"], popular: true },
  { id: "ibanez", name: "Ibanez", categories: ["instruments"] },
  { id: "taylor", name: "Taylor Guitars", categories: ["instruments"] },
  { id: "martin", name: "Martin & Co.", categories: ["instruments"] },
  { id: "korg", name: "Korg", categories: ["instruments"] },
  { id: "pearl", name: "Pearl Drums", categories: ["instruments"] },
  { id: "squier", name: "Squier", categories: ["instruments"] },
  { id: "epiphone", name: "Epiphone", categories: ["instruments"] },
  { id: "shure", name: "Shure", categories: ["instruments", "electronics"] },
  { id: "boss", name: "Boss", categories: ["instruments"] },
  { id: "casio", name: "Casio", categories: ["instruments", "watches-jewellery", "electronics"], popular: true },
  { id: "ludwig", name: "Ludwig Drums", categories: ["instruments"] },
  { id: "gretsch", name: "Gretsch", categories: ["instruments"] },
  { id: "prs", name: "PRS Guitars", categories: ["instruments"] },
  { id: "music-man", name: "Ernie Ball Music Man", categories: ["instruments"] },
  { id: "akai", name: "Akai", categories: ["instruments"] },
  { id: "native-instruments", name: "Native Instruments", categories: ["instruments"] },
  { id: "focusrite", name: "Focusrite", categories: ["instruments"] },

  // --- LEGO, toys & collectibles ---------------------------------------
  { id: "lego", name: "LEGO", categories: ["lego-toys", "collectibles-hobbies"], popular: true },
  { id: "mega", name: "MEGA (Mattel)", categories: ["lego-toys"] },
  { id: "playmobil", name: "Playmobil", categories: ["lego-toys", "kids-baby"] },
  { id: "knex", name: "K'NEX", categories: ["lego-toys"] },
  { id: "hasbro", name: "Hasbro", categories: ["lego-toys", "collectibles-hobbies", "kids-baby"], popular: true },
  { id: "mattel", name: "Mattel", categories: ["kids-baby", "collectibles-hobbies"], popular: true },
  { id: "bandai", name: "Bandai", categories: ["collectibles-hobbies", "gaming"] },
  { id: "funko", name: "Funko", categories: ["collectibles-hobbies"], popular: true },
  { id: "games-workshop", name: "Games Workshop", categories: ["collectibles-hobbies"] },
  { id: "topps", name: "Topps", categories: ["collectibles-hobbies"] },
  { id: "panini", name: "Panini", categories: ["collectibles-hobbies"] },

  // --- Electronics & tech -----------------------------------------------
  { id: "apple", name: "Apple", categories: ["electronics"], popular: true },
  { id: "samsung", name: "Samsung", categories: ["electronics", "pc-components"], popular: true },
  { id: "google", name: "Google", categories: ["electronics"], popular: true },
  { id: "bose", name: "Bose", categories: ["electronics"], popular: true },
  { id: "jbl", name: "JBL", categories: ["electronics"] },
  { id: "sonos", name: "Sonos", categories: ["electronics"] },
  { id: "dyson", name: "Dyson", categories: ["electronics", "home-living"], popular: true },
  { id: "garmin", name: "Garmin", categories: ["electronics", "sports-outdoors"] },
  { id: "fitbit", name: "Fitbit", categories: ["electronics"] },
  { id: "huawei", name: "Huawei", categories: ["electronics"] },
  { id: "oneplus", name: "OnePlus", categories: ["electronics"] },
  { id: "xiaomi", name: "Xiaomi", categories: ["electronics"] },
  { id: "anker", name: "Anker", categories: ["electronics"] },
  { id: "beats", name: "Beats by Dre", categories: ["electronics"] },

  // --- Women's & men's fashion -------------------------------------------
  { id: "zara", name: "Zara", categories: ["womens-fashion", "mens-fashion"], popular: true },
  { id: "hm", name: "H&M", categories: ["womens-fashion", "mens-fashion", "kids-baby"], popular: true },
  { id: "nike", name: "Nike", categories: ["womens-fashion", "mens-fashion", "sports-outdoors"], popular: true },
  { id: "adidas", name: "Adidas", categories: ["womens-fashion", "mens-fashion", "sports-outdoors"], popular: true },
  { id: "levis", name: "Levi's", categories: ["womens-fashion", "mens-fashion"], popular: true },
  { id: "mango", name: "Mango", categories: ["womens-fashion"] },
  { id: "cos", name: "COS", categories: ["womens-fashion", "mens-fashion"] },
  { id: "ganni", name: "Ganni", categories: ["womens-fashion"] },
  { id: "reformation", name: "Reformation", categories: ["womens-fashion"] },
  { id: "gucci", name: "Gucci", categories: ["womens-fashion", "mens-fashion", "bags-accessories"], popular: true },
  { id: "prada", name: "Prada", categories: ["womens-fashion", "bags-accessories"] },
  { id: "coach", name: "Coach", categories: ["bags-accessories", "womens-fashion"] },
  { id: "michael-kors", name: "Michael Kors", categories: ["womens-fashion", "bags-accessories", "watches-jewellery"] },
  { id: "ralph-lauren", name: "Ralph Lauren", categories: ["womens-fashion", "mens-fashion"], popular: true },
  { id: "calvin-klein", name: "Calvin Klein", categories: ["womens-fashion", "mens-fashion"] },
  { id: "tommy-hilfiger", name: "Tommy Hilfiger", categories: ["womens-fashion", "mens-fashion"], popular: true },
  { id: "asos", name: "ASOS", categories: ["womens-fashion", "mens-fashion"] },
  { id: "free-people", name: "Free People", categories: ["womens-fashion"] },
  { id: "vans", name: "Vans", categories: ["womens-fashion", "mens-fashion", "sports-outdoors"] },
  { id: "converse", name: "Converse", categories: ["womens-fashion", "mens-fashion"] },
  { id: "topshop", name: "Topshop", categories: ["womens-fashion"] },
  { id: "urban-outfitters", name: "Urban Outfitters", categories: ["womens-fashion", "mens-fashion", "home-living"] },
  { id: "other-stories", name: "& Other Stories", categories: ["womens-fashion"] },
  { id: "uniqlo", name: "Uniqlo", categories: ["womens-fashion", "mens-fashion", "kids-baby"], popular: true },
  { id: "carhartt-wip", name: "Carhartt WIP", categories: ["mens-fashion"] },
  { id: "stone-island", name: "Stone Island", categories: ["mens-fashion"] },
  { id: "north-face", name: "The North Face", categories: ["mens-fashion", "womens-fashion", "sports-outdoors"], popular: true },
  { id: "patagonia", name: "Patagonia", categories: ["mens-fashion", "womens-fashion", "sports-outdoors"], popular: true },
  { id: "hugo-boss", name: "Hugo Boss", categories: ["mens-fashion"] },
  { id: "barbour", name: "Barbour", categories: ["mens-fashion", "womens-fashion"] },
  { id: "new-balance", name: "New Balance", categories: ["mens-fashion", "womens-fashion", "sports-outdoors"] },
  { id: "dr-martens", name: "Dr. Martens", categories: ["mens-fashion", "womens-fashion"] },
  { id: "champion", name: "Champion", categories: ["mens-fashion", "womens-fashion"] },
  { id: "fred-perry", name: "Fred Perry", categories: ["mens-fashion"] },

  // --- Kids & baby --------------------------------------------------------
  { id: "mothercare", name: "Mothercare", categories: ["kids-baby"] },
  { id: "next", name: "Next", categories: ["kids-baby", "womens-fashion", "mens-fashion", "home-living"] },
  { id: "carters", name: "Carter's", categories: ["kids-baby"] },
  { id: "fisher-price", name: "Fisher-Price", categories: ["kids-baby"] },
  { id: "gap-kids", name: "Gap Kids", categories: ["kids-baby"] },
  { id: "jojo-maman-bebe", name: "JoJo Maman B\u00e9b\u00e9", categories: ["kids-baby"] },
  { id: "mamas-and-papas", name: "Mamas & Papas", categories: ["kids-baby"] },

  // --- Home & living --------------------------------------------------------
  { id: "ikea", name: "IKEA", categories: ["home-living"], popular: true },
  { id: "dunelm", name: "Dunelm", categories: ["home-living"] },
  { id: "john-lewis", name: "John Lewis", categories: ["home-living"] },
  { id: "le-creuset", name: "Le Creuset", categories: ["home-living"] },
  { id: "kitchenaid", name: "KitchenAid", categories: ["home-living"] },
  { id: "nutribullet", name: "Nutribullet", categories: ["home-living"] },
  { id: "habitat", name: "Habitat", categories: ["home-living"] },
  { id: "ninja-kitchen", name: "Ninja Kitchen", categories: ["home-living"] },

  // --- Sports & outdoors --------------------------------------------------------
  { id: "under-armour", name: "Under Armour", categories: ["sports-outdoors"], popular: true },
  { id: "wilson", name: "Wilson", categories: ["sports-outdoors"] },
  { id: "callaway", name: "Callaway", categories: ["sports-outdoors"] },
  { id: "taylormade", name: "TaylorMade", categories: ["sports-outdoors"] },
  { id: "decathlon", name: "Decathlon", categories: ["sports-outdoors"] },
  { id: "salomon", name: "Salomon", categories: ["sports-outdoors"] },
  { id: "trek", name: "Trek Bicycles", categories: ["sports-outdoors"] },
  { id: "specialized", name: "Specialized", categories: ["sports-outdoors"] },
  { id: "giant", name: "Giant Bicycles", categories: ["sports-outdoors"] },
  { id: "puma", name: "Puma", categories: ["sports-outdoors", "mens-fashion", "womens-fashion"], popular: true },
  { id: "reebok", name: "Reebok", categories: ["sports-outdoors", "mens-fashion", "womens-fashion"] },

  // --- Books, films & music --------------------------------------------------------
  { id: "penguin-books", name: "Penguin Books", categories: ["books-media"] },
  { id: "criterion-collection", name: "Criterion Collection", categories: ["books-media"] },

  // --- Watches & jewellery --------------------------------------------------------
  { id: "seiko", name: "Seiko", categories: ["watches-jewellery"], popular: true },
  { id: "citizen", name: "Citizen", categories: ["watches-jewellery"] },
  { id: "fossil", name: "Fossil", categories: ["watches-jewellery", "bags-accessories"] },
  { id: "rolex", name: "Rolex", categories: ["watches-jewellery"], popular: true },
  { id: "omega", name: "Omega", categories: ["watches-jewellery"] },
  { id: "pandora", name: "Pandora", categories: ["watches-jewellery"], popular: true },
  { id: "swarovski", name: "Swarovski", categories: ["watches-jewellery"] },
  { id: "tag-heuer", name: "TAG Heuer", categories: ["watches-jewellery"] },
  { id: "tissot", name: "Tissot", categories: ["watches-jewellery"] },

  // --- Bags & accessories --------------------------------------------------------
  { id: "kate-spade", name: "Kate Spade", categories: ["bags-accessories", "womens-fashion"] },
  { id: "herschel", name: "Herschel Supply Co.", categories: ["bags-accessories"] },
  { id: "fjallraven", name: "Fj\u00e4llr\u00e4ven", categories: ["bags-accessories", "sports-outdoors"] },
  { id: "longchamp", name: "Longchamp", categories: ["bags-accessories"] },
  { id: "ray-ban", name: "Ray-Ban", categories: ["bags-accessories"], popular: true },
  { id: "oakley", name: "Oakley", categories: ["bags-accessories", "sports-outdoors"] },
];

/**
 * Brands relevant to a top-level category, popular ones first then
 * alphabetical. With no category, returns the full alphabetised catalogue.
 */
export function getBrandsForCategory(topLevelCategoryId?: string): Brand[] {
  const pool = topLevelCategoryId
    ? brands.filter((b) => b.categories.includes(topLevelCategoryId))
    : brands;
  return [...pool].sort((a, b) => {
    if (!!a.popular !== !!b.popular) return a.popular ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Case-insensitive search across the whole brand catalogue. */
export function searchBrands(query: string, topLevelCategoryId?: string): Brand[] {
  const q = query.trim().toLowerCase();
  const pool = topLevelCategoryId
    ? brands.filter((b) => b.categories.includes(topLevelCategoryId))
    : brands;
  const matches = q ? pool.filter((b) => b.name.toLowerCase().includes(q)) : [...pool];
  return matches.sort((a, b) => a.name.localeCompare(b.name));
}
