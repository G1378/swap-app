import type {
  AppNotification,
  Badge,
  Conversation,
  GamificationProfile,
  Listing,
  ListingPhoto,
  Message,
  Profile,
  Quest,
  Rating,
  SwapRequest,
  UserBadgeWithBadge,
  UserQuestProgressWithQuest,
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

export function mapListingPhotoRow(row: Row): ListingPhoto {
  return {
    id: row.id,
    listingId: row.listing_id,
    url: row.url,
    position: row.position,
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
    parentRequestId: row.parent_request_id ?? null,
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

// --- Appended for lightweight gamification --------------------------------

export function mapGamificationProfileRow(row: Row): GamificationProfile {
  return {
    id: row.id,
    profileId: row.profile_id,
    xp: row.xp,
    level: row.level,
    tier: row.tier,
    pointsBalance: row.points_balance,
    currentStreakWeeks: row.current_streak_weeks,
    longestStreakWeeks: row.longest_streak_weeks,
    profileCompletedBonusAwarded: row.profile_completed_bonus_awarded ?? false,
    lastActivityWeekStart: row.last_activity_week_start ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBadgeRow(row: Row): Badge {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    icon: row.icon,
    createdAt: row.created_at,
  };
}

/** Expects a `user_badges` row with an embedded `badge:badges(*)` join,
 * as returned by `select("*, badge:badges(*)")`. */
export function mapUserBadgeWithBadgeRow(row: Row): UserBadgeWithBadge {
  return {
    id: row.id,
    gamificationProfileId: row.gamification_profile_id,
    badgeId: row.badge_id,
    earnedAt: row.earned_at,
    badge: mapBadgeRow(row.badge),
  };
}

export function mapQuestRow(row: Row): Quest {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    cadence: row.cadence,
    category: row.category ?? null,
    xpReward: row.xp_reward,
    pointsReward: row.points_reward,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/** Expects a `user_quest_progress` row with an embedded `quest:quests(*)`
 * join, as returned by `select("*, quest:quests(*)")`. */
export function mapUserQuestProgressWithQuestRow(row: Row): UserQuestProgressWithQuest {
  return {
    id: row.id,
    gamificationProfileId: row.gamification_profile_id,
    questId: row.quest_id,
    status: row.status,
    progressCount: row.progress_count,
    targetCount: row.target_count,
    periodStart: row.period_start,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    quest: mapQuestRow(row.quest),
  };
}
