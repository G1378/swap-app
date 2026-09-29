# swap-app

An AI-powered swap marketplace: list items you don't want, say what you'd
take in return, and get matched with people who have it — directly or
through a multi-person swap chain.

## What's in this increment

This drop focuses on **the publish flow's category and brand picking** —
the part of the app where "cleanly picking through a wide variety of
brands and categories" actually happens. It's a real, buildable Next.js
app, not a mockup:

- `app/publish` — the "List an item" page.
- `components/publish/CategoryPicker.tsx` — a Vinted-style picker: quick
  chips for the launch niches, drill-down through a category tree with
  breadcrumbs, and instant search across every category at any depth. You
  can also stop at any level ("use Cameras & Photography, no more specific
  subcategory") instead of being forced to the leaf.
- `components/publish/BrandPicker.tsx` — an eBay/Vinted-style picker:
  brands are filtered and re-ordered around whichever top-level category
  you picked, with a "popular for this category" chip row, an alphabetical
  list with sticky letter headers and a jump-to-letter index, and a
  fallback to type in a brand that isn't in the catalogue.
- `lib/data/categories.ts` — a ~15-category, multi-level tree spanning the
  plan's launch niches (gaming, PC components, cameras, musical
  instruments, LEGO) plus the broader categories a general swap
  marketplace needs (fashion, home, sport, collectibles, etc.).
- `lib/data/brands.ts` — ~130 brands, each tagged with the categories it's
  relevant to, so the brand list narrows intelligently instead of showing
  everything all the time.
- `components/publish/PublishForm.tsx` — wires the pickers into a full
  listing form (photos, condition, conditional size field, a wishlist of
  items wanted in return, swap-only vs. cash-top-up, location) with
  client-side validation and a mock submit.

Everything else from the project brief (auth, Supabase, Prisma schema,
messaging, ratings, etc.) is intentionally **not** built yet. The
`services/listings.ts` stub is the seam where real persistence plugs in
later without touching any component.

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, then "List an item" for the publish flow.

Other scripts:

```bash
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit, no build output
```

## Environment variables

None are required to run this increment — the publish page is entirely
client-side and `createListing()` is a stub. `.env.example` lists the
Supabase variables the persistence layer will need once it's wired in.

## Project structure

```
swap-app/
├── app/
│   ├── layout.tsx          Root layout: font, metadata
│   ├── globals.css         Tailwind layers + design tokens
│   ├── page.tsx            Landing page → "List an item"
│   └── publish/page.tsx    Publish page shell
├── components/
│   ├── ui/                 Small reusable primitives (button, input,
│   │                       textarea, sheet, field, chip-group)
│   └── publish/            Feature components (pickers, uploader, form)
├── lib/
│   ├── data/                Category tree, brand catalogue, conditions
│   ├── validation/listing.ts Draft validation
│   └── utils.ts             cn() class-name helper
├── services/listings.ts     createListing() — persistence seam
├── types/                   Shared TypeScript types
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
├── eslint.config.mjs
├── .env.example
└── .gitignore
```

## Architecture notes

- **UI vs. logic**: picker components (`CategoryPicker`, `BrandPicker`)
  own their own open/search/navigation state but take `value`/`onChange`,
  so `PublishForm` doesn't know anything about how picking works
  internally.
- **Data vs. components**: the category tree and brand catalogue are pure
  data modules (`lib/data/*`) with small query helpers
  (`searchCategories`, `getBrandsForCategory`, ...) that both the pickers
  and, later, search/filter UI elsewhere in the app can reuse.
- **Validation** lives in `lib/validation/listing.ts`, separate from the
  form component, so it can be unit tested or reused (e.g. for a
  server-side check later) without a browser.
- **Persistence seam**: `services/listings.ts` is the only file that will
  need to change when Supabase is connected — swap the stub body for a
  real insert + storage upload and return `persisted: true`.

## Next steps

Following the same pattern, the natural next slices are: Supabase auth +
`createListing` persistence, the listings/browse feed reusing
`lib/data/categories.ts` and `lib/data/brands.ts` as filters, and the
Prisma schema for `users`, `listings`, `swap_requests`, etc. from the
project brief.
