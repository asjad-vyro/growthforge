// Pinned actor IDs behind per-platform adapters — swap actors without
// touching the pipeline. Prices are Starter-tier, Aug 2026.
export type Platform = "instagram_posts" | "instagram_reels" | "x" | "linkedin";

export const PLATFORMS: Platform[] = ["instagram_posts", "instagram_reels", "x", "linkedin"];

const MAX_ITEMS = Number(process.env.SCRAPE_MAX_ITEMS_PER_PLATFORM ?? 200);

type ActorConfig = {
  actorId: string;
  costPer1k: number;
  buildInput: (keywords: string[]) => Record<string, unknown>;
};

export const ACTOR_CONFIGS: Record<Platform, ActorConfig> = {
  instagram_posts: {
    actorId: "apify/instagram-hashtag-scraper",
    costPer1k: 2.3,
    buildInput: (keywords) => ({
      hashtags: keywords.map((k) => k.replace(/\s+/g, "")).slice(0, 6),
      resultsType: "posts",
      resultsLimit: Math.ceil(MAX_ITEMS / Math.min(keywords.length, 6)),
    }),
  },
  instagram_reels: {
    actorId: "apify/instagram-hashtag-scraper",
    costPer1k: 2.3,
    buildInput: (keywords) => ({
      hashtags: keywords.map((k) => k.replace(/\s+/g, "")).slice(0, 6),
      resultsType: "reels",
      resultsLimit: Math.ceil(MAX_ITEMS / Math.min(keywords.length, 6)),
    }),
  },
  x: {
    actorId: "apidojo/tweet-scraper",
    costPer1k: 0.4,
    buildInput: (keywords) => ({
      searchTerms: keywords.slice(0, 5).map((k) => `${k} min_faves:20 -filter:replies`),
      maxItems: MAX_ITEMS,
      sort: "Top",
    }),
  },
  linkedin: {
    actorId: "harvestapi/linkedin-post-search",
    costPer1k: 1.5,
    buildInput: (keywords) => ({
      searchQueries: keywords.slice(0, 3),
      maxPosts: MAX_ITEMS,
      postedLimit: "month",
    }),
  },
};

export const SCREENSHOT_ACTOR = "apify/screenshot-url";

export function estimateScrapeCost(platform: Platform, items: number): number {
  return (ACTOR_CONFIGS[platform].costPer1k * items) / 1000;
}
