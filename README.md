# Profile Redesign — Update Package

This zip contains only new/modified files for the profile redesign feature,
laid out at the same paths they belong at in the `swap-app` repo. Copy them
in directly, preserving the folder structure.

## What's new

- **Public profiles**: `app/profile/[username]/page.tsx` — anyone can view
  `/profile/some-username`. Redirects to `/profile` if it's your own.
- **Own profile**: `app/profile/page.tsx` — rewritten to a thin wrapper
  around the new shared `ProfileView` component.
- **Tabs**: Listings / Swapped / Wishlist (own profile only) / Reviews.
- **Written reviews**: full comment list + a star-count breakdown, not just
  the aggregate average.
- **Edit profile modal**: username, full name, bio, location, and avatar
  upload (new `avatars` storage bucket).
- **Badges**: computed (not stored) achievements based on completed-swap
  count and rating average — Power Swapper, Active Swapper, Highly Rated,
  New Swapper.
- **Bonus — wishlist heart toggle**: `wishlist_items` existed in your schema
  but nothing wrote to it, so the Wishlist tab would always be empty. Added
  a small heart button on listing cards to save/unsave, wired to that table.

## Setup steps

1. **Run the migration** in the Supabase SQL editor:
   `prisma/migrations_manual/0004_avatars_storage.sql`
   (creates the `avatars` storage bucket + RLS policies, mirrors the
   existing `listing-images` bucket setup).

2. **Copy files in**, preserving paths:
   ```
   prisma/migrations_manual/0004_avatars_storage.sql
   types/index.ts                          (replaces existing file)
   lib/ratings.ts                          (replaces existing file)
   lib/profiles.ts                         (new)
   lib/wishlist.ts                         (new)
   lib/badges.ts                           (new)
   components/ui/tabs.tsx                  (new)
   components/wishlist-button.tsx          (new)
   components/wishlistable-listing-card.tsx (new)
   components/profile/badge-pill.tsx       (new)
   components/profile/profile-header.tsx   (new)
   components/profile/rating-breakdown.tsx (new)
   components/profile/review-card.tsx      (new)
   components/profile/edit-profile-dialog.tsx (new)
   components/profile/profile-tabs-section.tsx (new)
   components/profile/profile-view.tsx     (new)
   app/profile/page.tsx                    (replaces existing file)
   app/profile/[username]/page.tsx         (new)
   ```

   Note: `types/index.ts` and `lib/ratings.ts` are **full replacement
   files** — they contain everything from the originals plus the new
   additions, so just overwrite the existing ones.

3. **No new npm dependencies** — everything uses packages already in your
   `package.json` (`lucide-react`, `class-variance-authority`,
   `tailwind-merge`, `clsx`, `next`, `@supabase/supabase-js`).

4. Restart the dev server and visit `/profile` (your own) or
   `/profile/<any-username>` (public view).
