import { z } from "zod";

// LLM-facing schemas: keep every field required (strict json_schema mode) —
// use empty arrays/strings instead of optionals.

export const ChunkTrendsSchema = z.object({
  topics: z.array(
    z.object({
      topic: z.string(),
      why_now: z.string(),
      evidence_post_ids: z.array(z.string()),
    }),
  ),
  hooks: z.array(
    z.object({
      pattern: z.string(),
      fill_in_template: z.string(),
      example: z.string(),
      evidence_post_ids: z.array(z.string()),
    }),
  ),
  formats: z.array(
    z.object({
      format: z.string(),
      notes: z.string(),
    }),
  ),
  tone_notes: z.array(z.string()),
  hashtags: z.array(z.string()),
});
export type ChunkTrends = z.infer<typeof ChunkTrendsSchema>;

export const TrendReportSchema = z.object({
  summary: z.string(),
  trending_topics: z.array(
    z.object({
      topic: z.string(),
      why_now: z.string(),
      platforms: z.array(z.string()),
      engagement_index: z.number(),
      evidence_post_ids: z.array(z.string()),
    }),
  ),
  hooks: z.array(
    z.object({
      pattern: z.string(),
      fill_in_template: z.string(),
      platform: z.string(),
      examples: z.array(z.string()),
      evidence_post_ids: z.array(z.string()),
    }),
  ),
  formats: z.array(
    z.object({
      format: z.string(),
      platform: z.string(),
      prevalence_pct: z.number(),
      engagement_index: z.number(),
      notes: z.string(),
    }),
  ),
  tone_patterns: z.array(
    z.object({
      pattern: z.string(),
      platforms: z.array(z.string()),
    }),
  ),
  hashtags: z.array(
    z.object({
      tag: z.string(),
      platform: z.string(),
      engagement_index: z.number(),
    }),
  ),
  per_platform: z.array(
    z.object({
      platform: z.string(),
      top_topics: z.array(z.string()),
      dominant_formats: z.array(z.string()),
      notes: z.string(),
    }),
  ),
  content_angles: z.array(
    z.object({
      angle: z.string(),
      maps_to_usp: z.string(),
      recommended_asset_types: z.array(z.enum(["tweet", "thread", "carousel", "image_ad", "reel"])),
      suggested_hook: z.string(),
      evidence_post_ids: z.array(z.string()),
    }),
  ),
});
export type TrendReport = z.infer<typeof TrendReportSchema> & {
  posting_patterns?: PostingPatterns;
};

export type PostingPatterns = Record<
  string,
  { bestDays: { day: string; index: number }[]; bestHours: { hour: number; index: number }[] }
>;
