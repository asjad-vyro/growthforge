import { type NormalizedPost, num, count, str, when } from "./types";
import { extractHashtags } from "./instagram";

// apidojo/tweet-scraper (Tweet Scraper V2) item
export function normalizeX(item: Record<string, unknown>): NormalizedPost | null {
  const externalId = str(item.id);
  const text = str(item.text) ?? str(item.fullText);
  if (!externalId || !text) return null;

  const author = (item.author ?? {}) as Record<string, unknown>;
  const media: NormalizedPost["media"] = [];
  const extended = (item.extendedEntities ?? item.media ?? {}) as Record<string, unknown>;
  const mediaList = Array.isArray(extended.media)
    ? (extended.media as Record<string, unknown>[])
    : Array.isArray(item.media)
      ? (item.media as Record<string, unknown>[])
      : [];
  for (const m of mediaList.slice(0, 4)) {
    const url = str(m.media_url_https) ?? str(m.url);
    if (url) media.push({ type: str(m.type) === "video" ? "video" : "image", url });
  }

  return {
    platform: "x",
    externalId,
    url: str(item.url) ?? str(item.twitterUrl),
    authorHandle: str(author.userName) ?? str(author.screen_name),
    authorName: str(author.name),
    authorFollowers: num(author.followers) ?? num(author.followersCount),
    text,
    media,
    metrics: {
      likes: count(item.likeCount),
      comments: count(item.replyCount),
      shares: count(item.retweetCount),
      reposts: count(item.quoteCount),
      views: count(item.viewCount),
    },
    hashtags: extractHashtags(text),
    postedAt: when(item.createdAt),
    raw: item,
  };
}
