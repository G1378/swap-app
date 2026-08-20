import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[nextauth]/route";
import { NextResponse } from "next/server";

export async function getAuthSession() {
  return await getServerSession(authOptions);
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
