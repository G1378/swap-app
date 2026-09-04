import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { SwapStatus } from "@prisma/client";

/**
 * PATCH /api/swaps/:id
 * Updates a swap request status
 * 
 * Request body:
 * {
 *   status: "pending" | "accepted" | "rejected"
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: pending, accepted, or rejected" },
        { status: 400 }
      );
    }

    // Fetch the swap request with items to determine ownership
    const swapRequest = await prisma.swapRequest.findUnique({
      where: { id: params.id },
      include: {
        swapItems: {
          include: {
            item: {
              select: {
                user_id: true,
              },
            },
          },
        },
      },
    });

    if (!swapRequest) {
      return NextResponse.json(
        { error: "Swap request not found" },
        { status: 404 }
      );
    }

    // Get the owner of the requested items (the person who needs to approve)
    const requestedItems = swapRequest.swapItems.filter(si => si.type === 'requested');
    
    if (requestedItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid swap request - no requested items" },
        { status: 400 }
      );
    }

    // All requested items should belong to the same user (the recipient)
    const recipientId = requestedItems[0].item.user_id;
    const isRequester = swapRequest.requester_id === session!.user.id;
    const isRecipient = recipientId === session!.user.id;

    // Authorization: Only requester or recipient can modify
    if (!isRequester && !isRecipient) {
      return NextResponse.json(
        { error: "Forbidden - You are not part of this swap" },
        { status: 403 }
      );
    }

    // Business logic: Only recipient can accept/reject, requester can cancel (set to rejected)
    if (status === 'accepted' && !isRecipient) {
      return NextResponse.json(
        { error: "Only the item owner can accept the swap" },
        { status: 403 }
      );
    }

    // Update the swap request
    const updatedSwap = await prisma.swapRequest.update({
      where: { id: params.id },
      data: { status: status as SwapStatus },
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

    // If accepted, mark items as unavailable
    if (status === 'accepted') {
      const allItemIds = swapRequest.swapItems.map(si => si.item_id);
      await prisma.item.updateMany({
        where: {
          id: { in: allItemIds },
        },
        data: {
          is_available: false,
        },
      });
    }

    return NextResponse.json(updatedSwap);
  } catch (error) {
    console.error("Error updating swap request:", error);
    return NextResponse.json(
      { error: "Failed to update swap request" },
      { status: 500 }
    );
  }
}
