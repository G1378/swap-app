import { z } from "zod";
import {
  FEED_EVENT_TUNING,
  FEED_MAX_EXCLUDE_IDS,
  FEED_MAX_PAGE_SIZE,
  FEED_PAGE_SIZE,
} from "@/lib/feed/constants";

/** Body of POST /api/discover/feed. */
export const feedRequestSchema = z.object({
  limit: z.number().int().min(1).max(FEED_MAX_PAGE_SIZE).default(FEED_PAGE_SIZE),
  excludeIds: z.array(z.string().uuid()).max(FEED_MAX_EXCLUDE_IDS).default([]),
});

export const feedEventSchema = z.object({
  listingId: z.string().uuid(),
  type: z.enum(["impression", "info_open", "swap_started", "pass"]),
  dwellMs: z.number().int().min(0).max(FEED_EVENT_TUNING.maxDwellMs).optional(),
  position: z.number().int().min(0).max(100_000).optional(),
});

/** Body of POST /api/discover/events. */
export const feedEventsRequestSchema = z.object({
  events: z.array(feedEventSchema).min(1).max(FEED_EVENT_TUNING.maxBatch),
});

export type FeedRequest = z.infer<typeof feedRequestSchema>;
export type FeedEventsRequest = z.infer<typeof feedEventsRequestSchema>;
