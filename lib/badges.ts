import type { ProfileBadge, RatingSummary } from "@/types";

interface BadgeInput {
  completedSwaps: number;
  ratingSummary: RatingSummary;
}

export function computeBadges({ completedSwaps, ratingSummary }: BadgeInput): ProfileBadge[] {
  const badges: ProfileBadge[] = [];

  if (completedSwaps >= 20) {
    badges.push({
      id: "power-swapper",
      label: "Power Swapper",
      description: "Completed 20+ swaps",
      icon: "trophy",
    });
  } else if (completedSwaps >= 5) {
    badges.push({
      id: "active-swapper",
      label: "Active Swapper",
      description: "Completed 5+ swaps",
      icon: "flame",
    });
  }

  if (ratingSummary.count >= 5 && (ratingSummary.average ?? 0) >= 4.5) {
    badges.push({
      id: "highly-rated",
      label: "Highly Rated",
      description: "4.5+ average rating from 5+ reviews",
      icon: "star",
    });
  }

  if (completedSwaps === 0 && ratingSummary.count === 0) {
    badges.push({
      id: "new-swapper",
      label: "New Swapper",
      description: "Just getting started",
      icon: "sparkles",
    });
  }

  return badges;
}
