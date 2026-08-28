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
