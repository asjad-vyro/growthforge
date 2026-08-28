// All LLM calls go through OpenRouter. Slugs are config, not code — override
// via env without touching call sites. Check current slugs at openrouter.ai/models.
export const MODEL_MAP = {
  /** Trend map stage — mid-tier, ~15 parallel calls per run */
  map: process.env.LLM_MODEL_MAP_STAGE ?? "anthropic/claude-sonnet-4.5",
  /** Trend reduce + final copy — strongest available */
  reduce: process.env.LLM_MODEL_REDUCE ?? "anthropic/claude-opus-4.6",
  /** Asset copy generation (tweets, slides) */
  copy: process.env.LLM_MODEL_COPY ?? "anthropic/claude-sonnet-4.5",
  /** Onboarding extraction — cheap + vision-capable */
  extract: process.env.LLM_MODEL_EXTRACT ?? "google/gemini-2.5-flash",
} as const;

export type ModelTask = keyof typeof MODEL_MAP;
