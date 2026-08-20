import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ItemCondition } from "@prisma/client";

/**
 * GET /api/items
 * Returns a list of items with optional filters
 * Query params:
 * - category: string
 * - condition: new | good | worn
 * - distance: number (stub implementation)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');
    const distance = searchParams.get('distance');

    // Build filter object
    const where: any = {
      is_available: true, // Only show available items
    };

    if (category) {
      where.category = category;
    }

    if (condition && ['new', 'good', 'worn'].includes(condition)) {
      where.condition = condition as ItemCondition;
    }

    // Distance filtering is stubbed for Phase 1
    // In production, this would calculate distance based on user location
    if (distance) {
      // TODO: Implement geospatial filtering when needed
      console.log(`Distance filter requested: ${distance}km (not yet implemented)`);
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            image: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/items
 * Creates a new item listing
 * Required fields: title, description, category, condition
 */
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { title, description, category, condition } = body;

    // Validate required fields
    if (!title || !description || !category || !condition) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, category, condition" },
        { status: 400 }
      );
    }

    // Validate condition enum
    if (!['new', 'good', 'worn'].includes(condition)) {
      return NextResponse.json(
        { error: "Invalid condition. Must be: new, good, or worn" },
        { status: 400 }
      );
    }

    // Create the item
    const item = await prisma.item.create({
      data: {
        user_id: session!.user.id,
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        condition: condition as ItemCondition,
        is_available: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 }
    );
  }
}
