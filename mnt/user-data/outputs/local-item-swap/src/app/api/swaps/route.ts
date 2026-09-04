import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { SwapItemType } from "@prisma/client";

/**
 * POST /api/swaps
 * Creates a new swap request
 * 
 * Request body:
 * {
 *   offered_item_ids: string[],  // Items the requester is offering
 *   requested_item_ids: string[] // Items the requester wants
 * }
 */
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { offered_item_ids = [], requested_item_ids = [] } = body;

    // Validate that arrays are provided
    if (!Array.isArray(offered_item_ids) || !Array.isArray(requested_item_ids)) {
      return NextResponse.json(
        { error: "offered_item_ids and requested_item_ids must be arrays" },
        { status: 400 }
      );
    }

    // At least one item must be involved
    if (offered_item_ids.length === 0 && requested_item_ids.length === 0) {
      return NextResponse.json(
        { error: "At least one item must be specified" },
        { status: 400 }
      );
    }

    // Verify all offered items belong to the requester
    if (offered_item_ids.length > 0) {
      const offeredItems = await prisma.item.findMany({
        where: {
          id: { in: offered_item_ids },
        },
        select: { id: true, user_id: true, is_available: true },
      });

      if (offeredItems.length !== offered_item_ids.length) {
        return NextResponse.json(
          { error: "One or more offered items not found" },
          { status: 404 }
        );
      }

      const notOwned = offeredItems.find(item => item.user_id !== session!.user.id);
      if (notOwned) {
        return NextResponse.json(
          { error: "You can only offer your own items" },
          { status: 403 }
        );
      }

      const notAvailable = offeredItems.find(item => !item.is_available);
      if (notAvailable) {
        return NextResponse.json(
          { error: "One or more offered items are not available" },
          { status: 400 }
        );
      }
    }

    // Verify all requested items exist and are available
    if (requested_item_ids.length > 0) {
      const requestedItems = await prisma.item.findMany({
        where: {
          id: { in: requested_item_ids },
        },
        select: { id: true, user_id: true, is_available: true },
      });

      if (requestedItems.length !== requested_item_ids.length) {
        return NextResponse.json(
          { error: "One or more requested items not found" },
          { status: 404 }
        );
      }

      const notAvailable = requestedItems.find(item => !item.is_available);
      if (notAvailable) {
        return NextResponse.json(
          { error: "One or more requested items are not available" },
          { status: 400 }
        );
      }

      // Cannot request your own items
      const ownItem = requestedItems.find(item => item.user_id === session!.user.id);
      if (ownItem) {
        return NextResponse.json(
          { error: "You cannot request your own items" },
          { status: 400 }
        );
      }
    }

    // Create swap request with items in a transaction
    const swapRequest = await prisma.$transaction(async (tx) => {
      // Create the swap request
      const swap = await tx.swapRequest.create({
        data: {
          requester_id: session!.user.id,
          status: 'pending',
        },
      });

      // Create swap items for offered items
      if (offered_item_ids.length > 0) {
        await tx.swapItem.createMany({
          data: offered_item_ids.map(item_id => ({
            swap_request_id: swap.id,
            item_id,
            type: 'offered' as SwapItemType,
          })),
        });
      }

      // Create swap items for requested items
      if (requested_item_ids.length > 0) {
        await tx.swapItem.createMany({
          data: requested_item_ids.map(item_id => ({
            swap_request_id: swap.id,
            item_id,
            type: 'requested' as SwapItemType,
          })),
        });
      }

      // Fetch complete swap with all relations
      return await tx.swapRequest.findUnique({
        where: { id: swap.id },
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
      });
    });

    return NextResponse.json(swapRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating swap request:", error);
    return NextResponse.json(
      { error: "Failed to create swap request" },
      { status: 500 }
    );
  }
}
