import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use on the server (Server Components,
 * Route Handlers, and Server Actions). Bridges Supabase's cookie-based
 * session storage with Next.js's `cookies()` API.
 *
 * Not parameterized with the `Database` type yet - see the note in
 * lib/supabase/client.ts for why, and how to enable it later.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component - middleware handles refresh instead.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Called from a Server Component - middleware handles refresh instead.
          }
        },
      },
    }
  );
}
