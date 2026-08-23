import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths a signed-in user can still reach even if they haven't finished
 * onboarding yet — the onboarding page itself, plus the auth flows that
 * might legitimately redirect them around before they get there.
 */
const ONBOARDING_EXEMPT_PREFIXES = ["/onboarding", "/login", "/signup", "/auth"];

function isOnboardingExempt(pathname: string): boolean {
  return ONBOARDING_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Refreshes the Supabase auth session (if needed) on every request, keeps
 * the session cookies in sync between the browser and the server, and
 * forces signed-in users who haven't finished onboarding over to
 * `/onboarding`. Called from the root middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refreshes the session cookie if it's expired - required for Server Components.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !isOnboardingExempt(request.nextUrl.pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && profile.onboarding_completed === false) {
      const redirectResponse = NextResponse.redirect(new URL("/onboarding", request.url));
      // Carry over the refreshed session cookies so the redirect doesn't drop them.
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }
  }

  return response;
}
