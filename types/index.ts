export type ListingStatus = "available" | "pending" | "swapped";

export interface Profile {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  imageUrl: string | null;
  wantedInReturn: string | null;
  status: ListingStatus;
  createdAt: string;
}

/** Mirrors the `swap_requests.status` check constraint + state machine. */
export type SwapRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

export interface SwapRequest {
  id: string;
  listingId: string;
  senderId: string;
  receiverId: string;
  offeredListingId: string | null;
  offeredItem: string | null;
  status: SwapRequestStatus;
  senderCompletedAt: string | null;
  receiverCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A SwapRequest joined with the records a detail/list view needs to render. */
export interface SwapRequestWithDetails extends SwapRequest {
  listing: Listing | null;
  offeredListing: Listing | null;
  sender: Profile | null;
  receiver: Profile | null;
  conversationId: string | null;
}

export interface Conversation {
  id: string;
  swapRequestId: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface Rating {
  id: string;
  authorId: string;
  subjectId: string;
  swapRequestId: string | null;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export type NotificationType = "swap_request" | "message" | "rating" | "system";

export interface AppNotification {
  id: string;
  profileId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}
