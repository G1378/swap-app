# SwapApp

An AI-powered swap marketplace — trade unwanted items instead of buying and selling. This is the initial scaffold: auth, landing page, discover page, and profile page, built to grow into the full matching-engine product described in the project plan.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui-style components + lucide-react icons
- **Supabase** for auth (email/password + OAuth-ready) and Postgres
- **Prisma** schema for the full data model (kept in sync with raw SQL/RLS policies)

## What's included

| Area | Status |
|---|---|
| Landing page | ✅ Hero, how-it-works, category highlights, CTA |
| Auth (email/password) | ✅ Sign up, log in, session refresh middleware |
| Auth (OAuth) | ✅ GitHub wired up as an example — add more providers in Supabase dashboard |
| Discover page | ✅ Search + category filter, falls back to sample listings until your DB has data |
| Profile page | ✅ Shows your info + your listings, protected route |
| Listings CRUD (create/edit/delete) | ✅ Form with photo upload to Supabase Storage, owner-only edit/delete |
| Swap requests, messaging, ratings | 🚧 Schema exists (Prisma + SQL), UI not yet built |
| Multi-way match engine | 🚧 Future feature per project plan |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Project Settings → API**, copy the `Project URL` and `anon public` key.
3. In **Project Settings → Database**, copy the connection string (URI, "Session" mode).

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DATABASE_URL`.

### 4. Set up the database

You have two equivalent options:

**Option A — run the raw SQL (recommended for Supabase):**
Open the SQL editor in your Supabase dashboard and run, in order:
1. `prisma/migrations_manual/0001_init.sql` — creates all MVP tables, enables
   Row Level Security, and adds a trigger that auto-creates a `profiles` row
   whenever someone signs up.
2. `prisma/migrations_manual/0002_storage.sql` — creates the public
   `listing-images` storage bucket used by the "New listing" form, with
   policies so users can only upload/edit/delete files inside their own
   `<user-id>/` folder.

**Option B — use Prisma migrations:**
```bash
npm run db:migrate
```
Note: if you use Prisma migrations, you'll still want to add the RLS
policies from the SQL file manually, since Prisma doesn't manage RLS.

### 5. (Optional) Generate typed Supabase types

Once your schema exists in Supabase:

```bash
npx supabase gen types typescript --project-id <your-project-id> > types/database.types.ts
```

### 6. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Project structure

```text
swap-app/
├── app/
│   ├── layout.tsx          # Root layout (navbar + footer)
│   ├── page.tsx             # Landing page
│   ├── globals.css
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── auth/callback/route.ts  # OAuth / email-confirm redirect handler
│   ├── discover/page.tsx    # Browse listings
│   ├── profile/page.tsx     # Current user's profile + listings
│   └── listings/
│       ├── new/page.tsx         # Create a listing
│       └── [id]/edit/page.tsx   # Edit/delete a listing (owner-only)
├── components/
│   ├── ui/                  # shadcn-style primitives (button, card, input, select, textarea...)
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── listing-card.tsx
│   ├── owned-listing-card.tsx  # ListingCard + edit link, used on profile
│   ├── listing-form.tsx     # Shared create/edit form incl. image upload
│   └── discover-grid.tsx    # Client-side search/filter
├── lib/
│   ├── supabase/client.ts   # Browser Supabase client
│   ├── supabase/server.ts   # Server Supabase client
│   ├── supabase/middleware.ts
│   └── utils.ts              # cn() helper
├── types/
│   ├── database.types.ts     # Placeholder — regenerate from Supabase
│   └── index.ts               # Domain types (Listing, Profile)
├── prisma/
│   ├── schema.prisma          # Full data model (see below)
│   └── migrations_manual/
│       ├── 0001_init.sql        # Tables + RLS policies
│       └── 0002_storage.sql     # listing-images storage bucket + policies
├── middleware.ts               # Refreshes Supabase session on every request
├── .env.example
└── package.json
```

## Data model

`prisma/schema.prisma` models the full marketplace described in the project
plan: `Profile`, `Listing`, `WishlistItem`, `SwapRequest`, `Conversation`,
`ConversationParticipant`, `Message`, `Rating`, `Notification`. Only
`profiles` and `listings` are wired into the UI so far — the rest is ready
for the next milestones (messaging, swap requests, ratings).

## Suggested next steps

1. **Swap request flow** — "Request swap" button on a listing → creates a
   `SwapRequest` row, notifies the owner.
2. **Messaging** — a conversation view backed by `conversations` /
   `messages`, ideally with Supabase Realtime for live updates.
3. **Wishlist** — "save" button on listings, wishlist tab on profile.
4. **Ratings** — prompt both parties to rate each other after a swap
   completes.
5. **Matching engine** — the long-term differentiator: start with direct
   1:1 matches (my listing ↔ their wishlist), then extend to multi-person
   swap chains.

## Notes on the current scaffold

- The **Discover** page falls back to sample listings if the `listings`
  table is empty, so the UI is demoable before you've added real data.
- The **Profile** page is a protected route — unauthenticated visitors are
  redirected to `/login`.
- Row Level Security is enabled on every table from the start so the app is
  safe to point at a real Supabase project immediately.
