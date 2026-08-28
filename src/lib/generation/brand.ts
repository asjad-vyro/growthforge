import type { BrandColors } from "@/lib/db/schema";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { downloadBuffer, BUCKETS } from "@/lib/storage";
import { toDataUri } from "./render";

export type BrandSnapshot = {
  colors: Required<BrandColors>;
  toneOfVoice: string;
  doNotSay: string[];
  logoDataUri: string | null;
  fonts: NonNullable<typeof schema.brandKits.$inferSelect.fonts>;
};

const DEFAULT_COLORS: Required<BrandColors> = {
  primary: "#4F46E5",
  secondary: "#0EA5E9",
  accent: "#F59E0B",
  background: "#0B0F1A",
  text: "#F8FAFC",
};

export async function getBrandSnapshot(projectId: string): Promise<BrandSnapshot> {
  const [kit] = await db
    .select()
    .from(schema.brandKits)
    .where(eq(schema.brandKits.projectId, projectId));

  let logoDataUri: string | null = null;
  if (kit?.logoPath) {
    try {
      const buf = await downloadBuffer(BUCKETS.brandAssets, kit.logoPath);
      const mime = kit.logoPath.endsWith(".svg")
        ? "image/svg+xml"
        : kit.logoPath.endsWith(".jpg") || kit.logoPath.endsWith(".jpeg")
          ? "image/jpeg"
          : "image/png";
      logoDataUri = toDataUri(buf, mime);
    } catch {
      logoDataUri = null;
    }
  }

  return {
    colors: { ...DEFAULT_COLORS, ...(kit?.colors ?? {}) },
    toneOfVoice: kit?.toneOfVoice ?? "confident, clear, friendly",
    doNotSay: kit?.doNotSay ?? [],
    logoDataUri,
    fonts: kit?.fonts ?? [],
  };
}

/** Compact text form of the brand for LLM prompts. */
export function brandPromptBlock(brand: BrandSnapshot): string {
  return [
    `Brand colors: primary ${brand.colors.primary}, secondary ${brand.colors.secondary}, accent ${brand.colors.accent}, background ${brand.colors.background}, text ${brand.colors.text}.`,
    `Tone of voice: ${brand.toneOfVoice}.`,
    brand.doNotSay.length ? `NEVER use these words/claims: ${brand.doNotSay.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
