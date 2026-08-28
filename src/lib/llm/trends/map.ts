import { generateStructured, type LlmUsage } from "@/lib/llm/client";
import { ChunkTrendsSchema, type ChunkTrends } from "@/lib/llm/schemas/trends";
import type { SampledPost } from "./sample";

export async function analyzeChunk(
  posts: SampledPost[],
): Promise<{ trends: ChunkTrends; usage: LlmUsage }> {
  const corpus = posts
    .map((p) => {
      const m = p.metrics ?? {};
      return [
        `[id:${p.id}] platform:${p.platform} engagement_z:${p.engagementScore ?? "?"}`,
        `by @${p.authorHandle ?? "?"} (${p.authorFollowers ?? "?"} followers) at ${p.postedAt?.toISOString().slice(0, 10) ?? "?"}`,
        `likes:${m.likes ?? 0} comments:${m.comments ?? 0} shares:${m.shares ?? 0} views:${m.views ?? 0}`,
        (p.text ?? "").slice(0, 700),
      ].join("\n");
    })
    .join("\n---\n");

  const { data, usage } = await generateStructured({
    task: "map",
    schemaName: "chunk_trends",
    schema: ChunkTrendsSchema,
    system: [
      "You are a social media trend analyst. You receive a batch of scraped posts from one market niche.",
      "Extract what is actually working: recurring TOPICS (with why-now), HOOK patterns (opening lines that grab attention — abstract them into fill-in templates), FORMATS (listicle, hot take, before/after, POV reel, carousel teardown, meme...), tone notes, and hashtags that co-occur with high engagement.",
      "Weight everything by engagement_z (z-score within platform). Only cite evidence_post_ids that appear verbatim as [id:...] in the input.",
    ].join("\n"),
    user: corpus,
    maxOutputTokens: 4096,
  });
  return { trends: data, usage };
}
