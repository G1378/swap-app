import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function getAuthSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? { user } : null;
}

export async function requireAuth() {
  const session = await getAuthSession();
  
  if (!session || !session.user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 }
      ),
      session: null,
    };
  }
  
  return { error: null, session };
}
