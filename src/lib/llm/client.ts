import OpenAI from "openai";
import { z } from "zod";
import { MODEL_MAP, type ModelTask } from "./models";

let client: OpenAI | null = null;
function openrouterClient(): OpenAI {
  client ??= new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY ?? "missing-openrouter-key",
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "GrowthForge",
    },
  });
  return client;
}

export type LlmUsage = { input: number; output: number; model: string };

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type StructuredCallOptions<T extends z.ZodTypeAny> = {
  task: ModelTask;
  system: string;
  user: string | ContentPart[];
  schema: T;
  schemaName: string;
  maxOutputTokens?: number;
};

/**
 * Structured LLM call: JSON-schema response_format + Zod validation + one
 * repair retry that feeds the validation error back to the model.
 */
export async function generateStructured<T extends z.ZodTypeAny>(
  opts: StructuredCallOptions<T>,
): Promise<{ data: z.infer<T>; usage: LlmUsage }> {
  const model = MODEL_MAP[opts.task];
  const jsonSchema = z.toJSONSchema(opts.schema);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user as string },
  ];

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      messages.push({
        role: "user",
        content: `Your previous JSON failed validation: ${lastError}\nReturn ONLY corrected JSON matching the schema. No prose.`,
      });
    }
    const completion = await openrouterClient().chat.completions.create({
      model,
      messages,
      max_tokens: opts.maxOutputTokens ?? 8192,
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName, strict: true, schema: jsonSchema },
      },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const usage: LlmUsage = {
      input: completion.usage?.prompt_tokens ?? 0,
      output: completion.usage?.completion_tokens ?? 0,
      model,
    };
    try {
      const parsed = opts.schema.parse(extractJson(raw));
      return { data: parsed, usage };
    } catch (e) {
      lastError = e instanceof Error ? e.message.slice(0, 2000) : String(e);
      messages.push({ role: "assistant", content: raw.slice(0, 8000) });
    }
  }
  throw new Error(`LLM structured output failed validation after repair retry: ${lastError}`);
}

/** Plain text completion (no schema). */
export async function generateText(opts: {
  task: ModelTask;
  system: string;
  user: string;
  maxOutputTokens?: number;
}): Promise<{ text: string; usage: LlmUsage }> {
  const model = MODEL_MAP[opts.task];
  const completion = await openrouterClient().chat.completions.create({
    model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: opts.maxOutputTokens ?? 4096,
  });
  return {
    text: completion.choices[0]?.message?.content ?? "",
    usage: {
      input: completion.usage?.prompt_tokens ?? 0,
      output: completion.usage?.completion_tokens ?? 0,
      model,
    },
  };
}

/** Tolerate models that wrap JSON in code fences despite response_format. */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}
