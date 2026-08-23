import type {
  AppNotification,
  Conversation,
  Listing,
  Message,
  Profile,
  Rating,
  SwapRequest,
} from "@/types";

/**
 * Supabase (via PostgREST) returns raw snake_case rows. The rest of the app
 * works in camelCase domain types (see types/index.ts). These helpers keep
 * that translation in one place instead of duplicating it in every page and
 * component that touches the database.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function mapListingRow(row: Row): Listing {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    category: row.category,
    condition: row.condition,
    imageUrl: row.image_url ?? null,
    wantedInReturn: row.wanted_in_return ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapProfileRow(row: Row): Profile {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    location: row.location ?? null,
    createdAt: row.created_at,
    onboardingCompleted: row.onboarding_completed ?? false,
  };
}

export function mapSwapRequestRow(row: Row): SwapRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    offeredListingId: row.offered_listing_id ?? null,
    offeredItem: row.offered_item ?? null,
    status: row.status,
    senderCompletedAt: row.sender_completed_at ?? null,
    receiverCompletedAt: row.receiver_completed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapConversationRow(row: Row): Conversation {
  return {
    id: row.id,
    swapRequestId: row.swap_request_id ?? null,
    createdAt: row.created_at,
  };
}

export function mapMessageRow(row: Row): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapRatingRow(row: Row): Rating {
  return {
    id: row.id,
    authorId: row.author_id,
    subjectId: row.subject_id,
    swapRequestId: row.swap_request_id ?? null,
    score: row.score,
    comment: row.comment ?? null,
    createdAt: row.created_at,
  };
}

export function mapNotificationRow(row: Row): AppNotification {
  return {
    id: row.id,
    profileId: row.profile_id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    link: row.link ?? null,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
