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
| Listing detail page | ✅ `/listings/[id]`, entry point for requesting a swap |
| Swap requests | ✅ Request → accept/decline/cancel → two-sided completion, enforced by DB triggers |
| In-app messaging | ✅ Realtime chat per swap request (`/swaps/[id]`) |
| Ratings & trade history | ✅ Rate the other party once a swap completes; shown on your profile |
| Notifications | ✅ Rows are created automatically (schema + triggers); no bell UI yet |
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
3. `prisma/migrations_manual/0003_swap_mechanics.sql` — adds the swap
   request state machine (offered item, two-sided completion), the
   `conversations` / `conversation_participants` / `messages` tables for
   in-app chat, and the triggers that keep listing availability,
   notifications, and ratings in sync automatically. See the "Swap
   mechanics" section below for how it all fits together.

After running migration 3, turn on **Realtime** for the `messages` table
(Database → Replication in the Supabase dashboard, or rely on the
`alter publication supabase_realtime add table public.messages;`
statement the migration already runs) so the chat UI updates live.

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
│   ├── listings/
│   │   ├── new/page.tsx         # Create a listing
│   │   └── [id]/
│   │       ├── page.tsx         # Listing detail + "Request swap" entry point
│   │       └── edit/page.tsx    # Edit/delete a listing (owner-only)
│   └── swaps/
│       ├── page.tsx             # "My Swaps" — tabbed list (action/active/history)
│       └── [id]/page.tsx        # Swap detail: items, actions, chat, rating
├── components/
│   ├── ui/                  # shadcn-style primitives (button, card, input, select, textarea, dialog...)
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── listing-card.tsx     # Links to /listings/[id]
│   ├── owned-listing-card.tsx  # ListingCard + edit link, used on profile
│   ├── listing-form.tsx     # Shared create/edit form incl. image upload
│   ├── listing-swap-action.tsx # "Request swap" button state on the detail page
│   ├── swap-request-dialog.tsx # Modal: pick an item to offer + opening message
│   ├── swaps-list.tsx       # Tabbed swap-request list (client)
│   ├── swap-status-badge.tsx
│   ├── swap-actions.tsx     # Accept/decline/cancel/mark-complete buttons
│   ├── chat-thread.tsx      # Realtime per-swap chat
│   ├── rating-panel.tsx     # Post-completion star rating
│   └── discover-grid.tsx    # Client-side search/filter
├── lib/
│   ├── supabase/client.ts   # Browser Supabase client
│   ├── supabase/server.ts   # Server Supabase client
│   ├── supabase/middleware.ts
│   ├── mappers.ts            # snake_case row -> camelCase domain type helpers
│   ├── swap-requests.ts      # Create/accept/decline/cancel/complete a swap
│   ├── messages.ts           # Chat history + realtime subscription + send
│   ├── ratings.ts             # Create rating, per-profile rating summary
│   └── utils.ts              # cn() helper
├── types/
│   ├── database.types.ts     # Placeholder — regenerate from Supabase
│   └── index.ts               # Domain types (Listing, Profile, SwapRequest, Message, Rating...)
├── prisma/
│   ├── schema.prisma          # Full data model (see below)
│   └── migrations_manual/
│       ├── 0001_init.sql        # Tables + RLS policies
│       ├── 0002_storage.sql     # listing-images storage bucket + policies
│       └── 0003_swap_mechanics.sql  # Swap state machine, chat tables, triggers
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

## Swap mechanics

The full MVP swap flow described in the project plan is implemented,
enforced primarily at the database layer (migration `0003`) so it holds
regardless of which client calls it:

```
Browse a listing (/listings/[id])
  → "Request swap": pick one of your own available items + optional note
  → swap_requests row created (status: pending)
      • trigger auto-creates a conversation + notifies the owner
  → Owner reviews at /swaps/[id]
      • Accept  → status: accepted; both items' listings flip to "pending"
      • Decline → status: declined; sender notified
  → Either side can Cancel while pending/accepted
  → Once accepted, either side negotiates in the built-in chat
      (Supabase Realtime, so messages appear live for both users)
  → Each side clicks "Mark my side complete"
      • once BOTH have confirmed, a trigger auto-advances status → completed
      • both listings flip to "swapped"
  → Both sides can leave a 1–5 star rating tied to that swap
      • shown as an aggregate on /profile and on the listing owner's card
```

Enforcement lives in `0003_swap_mechanics.sql`:
- **State machine** — a `before update` trigger only allows the receiver to
  accept/decline a pending request, only a participant to cancel, and only
  auto-advances to `completed` once both completion timestamps are set
  (never settable directly by a client).
- **Listing availability** — an `after update` trigger flips both items'
  `listings.status` between `available` ↔ `pending` ↔ `swapped` as the swap
  progresses.
- **Notifications** — rows are inserted into `notifications` on request
  created/accepted/declined/completed and on new messages. There's no bell
  UI yet (see "Suggested next steps"), but the data is there to build one.
- **Messaging RLS** — only the two participants in a conversation can read
  or post to it (`is_conversation_participant()`).
- **Ratings** — tied to a specific `swap_request_id`, one per participant
  per swap (unique index), only insertable once that swap is `completed`,
  and only for the *other* participant — all enforced in a trigger, not
  just the UI.

## Suggested next steps

1. **Wishlist** — "save" button on listings, wishlist tab on profile.
2. **Notifications UI** — a bell/dropdown reading from the `notifications`
   table the swap triggers already populate.
3. **Matching engine** — the long-term differentiator: start with direct
   1:1 matches (my listing ↔ their wishlist), then extend to multi-person
   swap chains.

## Notes on the current scaffold

- The **Discover** page falls back to sample listings if the `listings`
  table is empty, so the UI is demoable before you've added real data.
- The **Profile** page is a protected route — unauthenticated visitors are
  redirected to `/login`.
- Row Level Security is enabled on every table from the start so the app is
  safe to point at a real Supabase project immediately.
