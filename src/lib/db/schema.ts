import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------- Core ----------

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().unique(), // auth.users.id — created lazily on first login
  name: text("name").notNull().default("My workspace"),
  monthlyBudgetUsd: numeric("monthly_budget_usd", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  productDescription: text("product_description"),
  landingPageUrl: text("landing_page_url"),
  landingPageScreenshotPath: text("landing_page_screenshot_path"),
  icp: jsonb("icp").$type<{
    persona?: string;
    pains?: string[];
    goal?: string;
    demographics?: string;
    wateringHoles?: string[];
    extras?: {
      offers?: string;
      pricing?: string;
      testimonials?: string;
      goals?: string[];
      socials?: Record<string, string>;
    };
  }>(),
  usp: text("usp"),
  nicheKeywords: text("niche_keywords").array(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrandColors = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
};
export type BrandFont = {
  family: string;
  role: "heading" | "body";
  source: "google" | "upload";
  storagePath?: string;
  weight?: number;
};

export const brandKits = pgTable("brand_kits", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  logoPath: text("logo_path"),
  colors: jsonb("colors").$type<BrandColors>(),
  fonts: jsonb("fonts").$type<BrandFont[]>(),
  toneOfVoice: text("tone_of_voice"),
  doNotSay: text("do_not_say").array(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Pipeline ----------

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"), // queued|scraping|analyzing|generating|completed|partial|failed
    stageProgress: jsonb("stage_progress").$type<Record<string, { done: number; total: number }>>(),
    assetPlan: jsonb("asset_plan").$type<{ tweets: number; carousels: number; imageAds: number; reels: number }>(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pipeline_runs_project_idx").on(t.projectId, t.createdAt)],
);

// The queue. Every unit of work is a row.
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("queued"), // queued|running|done|failed|dead
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(4),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    dedupeKey: text("dedupe_key").unique(),
    error: text("error"),
    pipelineRunId: uuid("pipeline_run_id").references(() => pipelineRuns.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_claim_idx").on(t.status, t.runAfter, t.createdAt)],
);

export const scrapeJobs = pgTable(
  "scrape_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineRunId: uuid("pipeline_run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(), // instagram_posts|instagram_reels|linkedin|x
    apifyActorId: text("apify_actor_id"),
    apifyRunId: text("apify_run_id"),
    apifyDatasetId: text("apify_dataset_id"),
    input: jsonb("input").$type<Record<string, unknown>>(),
    status: text("status").notNull().default("queued"), // queued|running|succeeded|failed|timed_out
    postCount: integer("post_count").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("scrape_jobs_run_idx").on(t.pipelineRunId),
    uniqueIndex("scrape_jobs_apify_run_idx").on(t.apifyRunId),
  ],
);

export type PostMedia = { type: "image" | "video"; url: string; thumbPath?: string };
export type PostMetrics = {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reposts?: number;
};

export const scrapedPosts = pgTable(
  "scraped_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scrapeJobId: uuid("scrape_job_id").references(() => scrapeJobs.id, { onDelete: "set null" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url"),
    authorHandle: text("author_handle"),
    authorName: text("author_name"),
    authorFollowers: integer("author_followers"),
    text: text("text"),
    media: jsonb("media").$type<PostMedia[]>(),
    metrics: jsonb("metrics").$type<PostMetrics>(),
    engagementScore: numeric("engagement_score", { precision: 10, scale: 4 }),
    hashtags: text("hashtags").array(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    raw: jsonb("raw"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("scraped_posts_unique_idx").on(t.projectId, t.platform, t.externalId),
    index("scraped_posts_engagement_idx").on(t.projectId, t.platform, t.engagementScore),
    index("scraped_posts_posted_idx").on(t.projectId, t.postedAt),
  ],
);

export const trendReports = pgTable(
  "trend_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineRunId: uuid("pipeline_run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    report: jsonb("report").notNull(),
    corpusStats: jsonb("corpus_stats").$type<Record<string, unknown>>(),
    model: text("model"),
    tokenUsage: jsonb("token_usage").$type<{ input: number; output: number }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("trend_reports_project_idx").on(t.projectId, t.createdAt)],
);

export type AssetFile = {
  path: string;
  mime: string;
  width?: number;
  height?: number;
  durationS?: number;
  label?: string;
};

export const generatedAssets = pgTable(
  "generated_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    pipelineRunId: uuid("pipeline_run_id").references(() => pipelineRuns.id, { onDelete: "set null" }),
    trendReportId: uuid("trend_report_id").references(() => trendReports.id, { onDelete: "set null" }),
    type: text("type").notNull(), // tweet|thread|carousel|image_ad|reel
    status: text("status").notNull().default("queued"), // queued|generating|rendering|ready|failed
    content: jsonb("content").$type<Record<string, unknown>>(),
    files: jsonb("files").$type<AssetFile[]>(),
    promptLineage: jsonb("prompt_lineage").$type<Record<string, unknown>>(),
    parentAssetId: uuid("parent_asset_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("generated_assets_project_idx").on(t.projectId, t.createdAt)],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // apify_run|llm_call|imagine_image|imagine_video
    units: numeric("units", { precision: 14, scale: 4 }),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_events_ws_idx").on(t.workspaceId, t.createdAt)],
);

// Server-only secrets (imagine-mcp OAuth tokens etc). RLS enabled with NO
// policies — invisible to the anon key; only the service connection reads it.
export const appSecrets = pgTable("app_secrets", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
