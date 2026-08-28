import type { Platform } from "@/lib/apify/actors";
import { type NormalizedPost, num, count, str, when } from "./types";

// apify/instagram-hashtag-scraper item (posts + reels modes)
export function normalizeInstagram(
  item: Record<string, unknown>,
  platform: Platform,
): NormalizedPost | null {
  const externalId = str(item.id) ?? str(item.shortCode);
  if (!externalId) return null;

  const media: NormalizedPost["media"] = [];
  const videoUrl = str(item.videoUrl);
  const displayUrl = str(item.displayUrl);
  if (videoUrl) media.push({ type: "video", url: videoUrl });
  if (displayUrl) media.push({ type: "image", url: displayUrl });

  const caption = str(item.caption);
  return {
    platform,
    externalId,
    url: str(item.url) ?? (str(item.shortCode) ? `https://www.instagram.com/p/${item.shortCode}/` : undefined),
    authorHandle: str(item.ownerUsername),
    authorName: str(item.ownerFullName),
    authorFollowers: num(item.ownerFollowersCount),
    text: caption,
    media,
    metrics: {
      likes: count(item.likesCount),
      comments: count(item.commentsCount),
      shares: count(item.sharesCount),
      views: count(item.videoPlayCount) ?? count(item.videoViewCount),
    },
    hashtags: Array.isArray(item.hashtags)
      ? (item.hashtags as string[]).filter((h) => typeof h === "string")
      : extractHashtags(caption),
    postedAt: when(item.timestamp),
    raw: item,
  };
}

export function extractHashtags(text?: string): string[] {
  if (!text) return [];
  return [...text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase()).slice(0, 30);
}
