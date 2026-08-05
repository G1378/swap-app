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
