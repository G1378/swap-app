import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in the browser (Client Components).
 * Reads and writes the auth session via cookies so it stays in sync
 * with the server-side client.
 *
 * Not parameterized with the `Database` type yet: until you run
 * `supabase gen types typescript` (see README), table/column names aren't
 * checked at compile time. Swap in `createBrowserClient<Database>(...)`
 * once you've generated real types.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
