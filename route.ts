import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/users/me
 * Returns the authenticated user's profile
 */
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar_url: true,
        image: true,
        bio: true,
        location_lat: true,
        location_lng: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/me
 * Updates the authenticated user's profile
 * Allowed fields: name, bio, avatar_url, location_lat, location_lng
 */
export async function PATCH(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    
    // Only allow specific fields to be updated
    const allowedFields = ['name', 'bio', 'avatar_url', 'location_lat', 'location_lng'];
    const updateData: any = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Validate location data if provided
    if ('location_lat' in updateData || 'location_lng' in updateData) {
      const lat = updateData.location_lat;
      const lng = updateData.location_lng;
      
      if (lat !== null && (typeof lat !== 'number' || lat < -90 || lat > 90)) {
        return NextResponse.json(
          { error: "Invalid latitude value" },
          { status: 400 }
        );
      }
      
      if (lng !== null && (typeof lng !== 'number' || lng < -180 || lng > 180)) {
        return NextResponse.json(
          { error: "Invalid longitude value" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session!.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        avatar_url: true,
        image: true,
        bio: true,
        location_lat: true,
        location_lng: true,
        created_at: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
