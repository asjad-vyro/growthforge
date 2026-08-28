import { type NormalizedPost, num, str, when } from "./types";
import { extractHashtags } from "./instagram";

// harvestapi/linkedin-post-search item (no-cookie, public data)
export function normalizeLinkedIn(item: Record<string, unknown>): NormalizedPost | null {
  const externalId = str(item.id) ?? str(item.urn) ?? str(item.postUrn) ?? str(item.linkedinUrl);
  const text = str(item.content) ?? str(item.text) ?? str(item.postText);
  if (!externalId || !text) return null;

  const author = (item.author ?? {}) as Record<string, unknown>;
  const engagement = (item.engagement ?? item.socialActivity ?? {}) as Record<string, unknown>;

  const media: NormalizedPost["media"] = [];
  const images = Array.isArray(item.images) ? (item.images as unknown[]) : [];
  for (const img of images.slice(0, 4)) {
    const url = typeof img === "string" ? img : str((img as Record<string, unknown>).url);
    if (url) media.push({ type: "image", url });
  }

  return {
    platform: "linkedin",
    externalId,
    url: str(item.url) ?? str(item.linkedinUrl) ?? str(item.postUrl),
    authorHandle: str(author.publicIdentifier) ?? str(author.username),
    authorName: str(author.name) ?? str(author.fullName) ?? str(item.authorName),
    authorFollowers: num(author.followers) ?? num(author.followersCount),
    text,
    media,
    metrics: {
      likes: num(engagement.likes) ?? num(item.likesCount) ?? num(item.numLikes),
      comments: num(engagement.comments) ?? num(item.commentsCount) ?? num(item.numComments),
      shares: num(engagement.shares) ?? num(item.sharesCount) ?? num(item.numShares),
    },
    hashtags: extractHashtags(text),
    postedAt: when(item.postedAt ?? item.date ?? item.publishedAt),
    raw: item,
  };
}
