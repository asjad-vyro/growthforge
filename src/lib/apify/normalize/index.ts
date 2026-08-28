import type { Platform } from "@/lib/apify/actors";
import type { NormalizedPost } from "./types";
import { normalizeInstagram } from "./instagram";
import { normalizeX } from "./x";
import { normalizeLinkedIn } from "./linkedin";

export type { NormalizedPost };

export function normalizeItem(
  item: Record<string, unknown>,
  platform: Platform,
): NormalizedPost | null {
  switch (platform) {
    case "instagram_posts":
    case "instagram_reels":
      return normalizeInstagram(item, platform);
    case "x":
      return normalizeX(item);
    case "linkedin":
      return normalizeLinkedIn(item);
  }
}
