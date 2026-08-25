export type ListingStatus = "available" | "pending" | "swapped";

export interface Profile {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
  onboardingCompleted: boolean;
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

/** Additional gallery photos beyond a listing's cover (Listing.imageUrl). */
export interface ListingPhoto {
  id: string;
  listingId: string;
  url: string;
  position: number;
  createdAt: string;
}

/** Mirrors the `swap_requests.status` check constraint + state machine.
 * 'countered' is terminal for that row — a new linked row (parentRequestId)
 * carries the negotiation forward. */
export type SwapRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed" | "countered";

export interface SwapRequest {
  id: string;
  listingId: string;
  senderId: string;
  receiverId: string;
  /** Cash added on top of the offered item bundle, in cents. */
  cashOfferCents: number;
  /** Set when this row is a counter-offer replying to an earlier request. */
  parentRequestId: string | null;
  status: SwapRequestStatus;
  senderCompletedAt: string | null;
  receiverCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A SwapRequest joined with the records a detail/list view needs to render. */
export interface SwapRequestWithDetails extends SwapRequest {
  listing: Listing | null;
  /** The sender's offered bundle — one or more listings. */
  offeredListings: Listing[];
  sender: Profile | null;
  receiver: Profile | null;
  conversationId: string | null;
  /** Set if this request was itself superseded by a later counter-offer. */
  counteredByRequestId: string | null;
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
  /** Optional in-app path to navigate to when the notification is clicked. */
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Mirrors the `reports.reason` check constraint. */
export type ReportReason = "spam" | "scam_or_fraud" | "inappropriate_content" | "harassment" | "other";

// --- Appended for profile redesign ---------------------------------------

/** A Rating joined with the profile of whoever left it, for review lists. */
export interface RatingWithAuthor extends Rating {
  author: Profile | null;
}

/** Star-count breakdown (5→1) backing the reviews tab's histogram. */
export interface RatingBreakdown {
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  total: number;
}

/** Computed (not stored) achievement shown as a pill on the profile header. */
export interface ProfileBadge {
  id: string;
  label: string;
  description: string;
  icon: "trophy" | "star" | "flame" | "sparkles";
}

/** A wishlist_items row joined with the listing it points to. */
export interface WishlistEntry {
  id: string;
  profileId: string;
  listingId: string;
  createdAt: string;
  listing: Listing | null;
}
