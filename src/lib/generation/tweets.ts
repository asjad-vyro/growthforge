import { z } from "zod";
import { generateStructured, type LlmUsage } from "@/lib/llm/client";
import type { GenerationContext } from "./context";

const TweetVariantsSchema = z.object({
  variants: z.array(
    z.object({
      kind: z.enum(["tweet", "thread"]),
      tweets: z.array(z.string()),
    }),
  ),
});
export type TweetVariants = z.infer<typeof TweetVariantsSchema>;

export async function generateTweets(
  ctx: GenerationContext,
): Promise<{ content: TweetVariants; usage: LlmUsage }> {
  const { data, usage } = await generateStructured({
    task: "copy",
    schemaName: "tweet_variants",
    schema: TweetVariantsSchema,
    system: [
      "You write X/Twitter content for a startup founder. Produce 3 variants: two standalone tweets and one 4-6 tweet thread.",
      "Rules: every tweet ≤ 270 characters. No hashtag spam (max 1 per tweet, often 0). Lead with the hook. Concrete > abstract. Write like a sharp founder, not a brand account.",
      "Ground the style in the exemplar posts' energy without copying them.",
    ].join("\n"),
    user: ctx.promptPreamble,
    maxOutputTokens: 3000,
  });

  // Enforce the 280 limit in code — one repair pass via truncation guard
  const cleaned: TweetVariants = {
    variants: data.variants.map((v) => ({
      kind: v.kind,
      tweets: v.tweets.map((t) => (t.length > 280 ? `${t.slice(0, 276)}…` : t)).filter(Boolean),
    })),
  };
  return { content: cleaned, usage };
}
