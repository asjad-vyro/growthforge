import type { PostMedia, PostMetrics } from "@/lib/db/schema";
import type { Platform } from "@/lib/apify/actors";

export type NormalizedPost = {
  platform: Platform;
  externalId: string;
  url?: string;
  authorHandle?: string;
  authorName?: string;
  authorFollowers?: number;
  text?: string;
  media: PostMedia[];
  metrics: PostMetrics;
  hashtags: string[];
  postedAt?: Date;
  raw: Record<string, unknown>;
};

export const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

export const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

export const when = (v: unknown): Date | undefined => {
  if (typeof v !== "string" && typeof v !== "number") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/**
 * Metric counts. Platforms use a negative sentinel for "hidden", not a real
 * count — Instagram returns `likesCount: -1` when the poster hides likes.
 * Left as-is, `-1` cancels the `1 +` in the engagement z-score and Postgres
 * raises 2201E (cannot take logarithm of zero), failing the whole ingest.
 */
export const count = (v: unknown): number | undefined => {
  const n = num(v);
  return n === undefined || n < 0 ? undefined : n;
};
