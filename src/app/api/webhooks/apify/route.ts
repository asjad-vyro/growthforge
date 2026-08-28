import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { enqueue, pokeWorker } from "@/lib/jobs/queue";
import { markScrapeJobFailed } from "@/lib/jobs/handlers/scrape";

// Pure event forwarder (<1s): verify secret → map Apify run → enqueue → poke.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.nextUrl.searchParams.get("secret") !== process.env.APIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    eventType?: string;
    resource?: { id?: string; defaultDatasetId?: string; status?: string };
  };
  const runId = body.resource?.id;
  const eventType = body.eventType ?? "";
  if (!runId) return NextResponse.json({ ok: true, ignored: "no run id" });

  const [sj] = await db
    .select({ id: schema.scrapeJobs.id, status: schema.scrapeJobs.status })
    .from(schema.scrapeJobs)
    .where(eq(schema.scrapeJobs.apifyRunId, runId));
  if (!sj) return NextResponse.json({ ok: true, ignored: "unknown run" });
  if (["succeeded", "failed", "timed_out"].includes(sj.status)) {
    return NextResponse.json({ ok: true, ignored: "already terminal" });
  }

  if (eventType === "ACTOR.RUN.SUCCEEDED") {
    await enqueue("scrape.ingest", { scrapeJobId: sj.id }, { dedupeKey: `ingest:${runId}` });
    pokeWorker();
  } else {
    await markScrapeJobFailed(sj.id, `apify ${eventType}`);
    pokeWorker();
  }
  return NextResponse.json({ ok: true });
}
