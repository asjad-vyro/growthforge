import type { JobRow } from "@/lib/jobs/queue";
import { runStart, scrapeStart, scrapeIngest, mediaThumbnails } from "./scrape";
import { trendsSample, trendsMapChunk, trendsReduce, runFinalize } from "./trends";
import { assetGenerate } from "./assets";

export const handlers: Record<string, (job: JobRow) => Promise<void>> = {
  "run.start": runStart,
  "scrape.start": scrapeStart,
  "scrape.ingest": scrapeIngest,
  "media.thumbnails": mediaThumbnails,
  "trends.sample": trendsSample,
  "trends.map_chunk": trendsMapChunk,
  "trends.reduce": trendsReduce,
  "asset.generate": assetGenerate,
  "run.finalize": runFinalize,
};
