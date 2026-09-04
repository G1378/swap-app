import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/swaps/my
 * Returns all swap requests where the user is either:
 * - The requester (initiated the swap)
 * - The recipient (owns requested items)
 */
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    // Get swaps where user is the requester
    const requestedSwaps = await prisma.swapRequest.findMany({
      where: {
        requester_id: session!.user.id,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            image: true,
          },
        },
        swapItems: {
          include: {
            item: {
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
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Get swaps where user owns the requested items
    const receivedSwaps = await prisma.swapRequest.findMany({
      where: {
        swapItems: {
          some: {
            type: 'requested',
            item: {
              user_id: session!.user.id,
            },
          },
        },
        // Exclude swaps where user is also the requester (already in requestedSwaps)
        requester_id: {
          not: session!.user.id,
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            image: true,
          },
        },
        swapItems: {
          include: {
            item: {
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
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({
      sent: requestedSwaps,
      received: receivedSwaps,
    });
  } catch (error) {
    console.error("Error fetching user swaps:", error);
    return NextResponse.json(
      { error: "Failed to fetch swap requests" },
      { status: 500 }
    );
  }
}
