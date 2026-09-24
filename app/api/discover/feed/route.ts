import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDiscoverFeedPage } from "@/lib/feed/queries";
import { feedRequestSchema } from "@/lib/feed/schemas";

// Reads the session cookie, so this can never be statically cached.
export const dynamic = "force-dynamic";

/**
 * Next page of the Discover feed. The first page is rendered by the
 * /discover server component; the reel calls this as the viewer nears the
 * end of what's loaded. Open to logged-out visitors too (they just get an
 * unpersonalised feed).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = feedRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feed request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const page = await getDiscoverFeedPage(supabase, user?.id ?? null, parsed.data);
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("POST /api/discover/feed failed.", error);
    return NextResponse.json({ error: "Could not load more listings." }, { status: 500 });
  }
}
