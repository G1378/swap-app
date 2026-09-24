import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { feedEventsRequestSchema } from "@/lib/feed/schemas";

export const dynamic = "force-dynamic";

/** Postgres foreign_key_violation — a listing in the batch was deleted
 * between being shown and being reported. Not worth failing over. */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Records a batch of Discover behaviour (impressions, opens, passes) for
 * the signed-in user. Rows are written with the user's own session, so
 * row-level security guarantees `user_id` is always the caller.
 *
 * Tracking is best-effort: the client ignores failures, and a batch that
 * can't be stored is dropped rather than retried.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = feedEventsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid events payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to record activity." }, { status: 401 });
    }

    const rows = parsed.data.events.map((event) => ({
      user_id: user.id,
      listing_id: event.listingId,
      event_type: event.type,
      dwell_ms: event.dwellMs ?? null,
      position: event.position ?? null,
    }));

    const { error } = await supabase.from("listing_events").insert(rows);

    if (error && error.code !== FOREIGN_KEY_VIOLATION) {
      console.error("POST /api/discover/events insert failed.", error.message);
      return NextResponse.json({ error: "Could not record events." }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("POST /api/discover/events failed.", error);
    return NextResponse.json({ error: "Could not record events." }, { status: 500 });
  }
}
