# SwapApp

A mobile-first marketplace for swapping unwanted items instead of buying and
selling them. Users list items, browse a swipeable discovery feed, and the
platform matches compatible trades — direct swaps today, with multi-person
swap chains planned as the long-term differentiator.

Launch niches: gaming, LEGO, camera equipment, musical instruments, and PC
components — categories where trading is already common.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**-style components (`components/ui/`)
- **Supabase** — Postgres, auth, and file storage, queried directly via
  `@supabase/supabase-js` / `@supabase/ssr` at runtime
- **Prisma** — schema and migrations only (see [Architecture notes](#architecture-notes))
- **Lucide** icons

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in your Supabase project's
   URL, anon key, and Postgres connection string:

   ```bash
   cp .env.example .env.local
   ```

3. **Run database migrations**

   The schema lives in `prisma/schema.prisma`; hand-authored SQL migrations
   live in `prisma/migrations_manual/`, applied in numeric order against
   your Supabase Postgres instance. Prisma itself is used for schema
   generation/inspection (`db:studio`) rather than `prisma migrate` driving
   the actual migration history — check `prisma/migrations_manual/` for the
   source of truth on schema changes.

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script             | Description                                   |
| ------------------ | ---------------------------------------------- |
| `npm run dev`       | Start the Next.js dev server                   |
| `npm run build`     | `prisma generate && next build` — production build |
| `npm run start`     | Serve the production build                     |
| `npm run lint`      | Run `next lint`                                |
| `npm run db:generate` | Regenerate the Prisma client                 |
| `npm run db:migrate`  | Run Prisma migrations (dev)                  |
| `npm run db:studio`   | Open Prisma Studio                           |

## Project structure

```text
app/              Next.js App Router pages and layouts
components/       Reusable UI (components/ui/) and feature components
  gamification/   Streak/XP bar, quest cards, tier badges
lib/              Data access (Supabase queries), constants, utilities
  supabase/       Client/server/middleware Supabase clients
  gamification/   XP, level, streak, and quest logic
types/            Shared TypeScript types
prisma/           Schema + hand-authored SQL migrations
```

## Architecture notes

- **Supabase vs. Prisma**: all runtime reads/writes go through the Supabase
  client (`lib/supabase/*.ts`) — server components call `createClient()`
  from `lib/supabase/server`, client components from `lib/supabase/client`.
  Prisma's schema is the migration/documentation source of truth, but
  `@prisma/client` is not imported anywhere in application code.
- **Navigation**: `components/navbar.tsx` renders the desktop `<nav>`
  (`sm:` and up) and mounts `components/mobile-nav.tsx`, a fixed bottom tab
  bar that's the only navigation surface below the `sm` breakpoint.
- **Design tokens** (`app/globals.css`): `--primary` (coral) drives every
  user action — buttons, active nav state, the swap CTA. `--reward` (amber)
  is reserved for the gamification layer (streak, XP, quests) so the two
  systems stay visually distinct. Everything else is neutral gray,
  deliberately, so the palette stays to two intentional colors.
- **Gamification**: `lib/gamification/` — XP awards, level/tier
  thresholds, and quest bumping live in `constants.ts` and `queries.ts`.
  Streaks are weekly (`currentStreakWeeks`), not daily.
- **Discovery**: `/discover` is a full-screen swipeable reel
  (`components/discover-reel.tsx`); `/search` and `/discover/[category]`
  share a filterable grid (`components/discover-grid.tsx`) for fast
  scanning across many items at once.
