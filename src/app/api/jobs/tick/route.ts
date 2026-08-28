import { NextResponse, type NextRequest } from "next/server";
import { claimJobs, completeJob, failJob, reclaimStuckJobs } from "@/lib/jobs/queue";
import { handlers } from "@/lib/jobs/handlers";

// Queue worker. Vercel Cron sweeps every minute; enqueuers poke it directly.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

async function tick(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const deadline = Date.now() + (maxDuration - 60) * 1000;
  let processed = 0;
  const failures: string[] = [];

  await reclaimStuckJobs();

  while (Date.now() < deadline) {
    const jobs = await claimJobs(5);
    if (jobs.length === 0) break;

    for (const job of jobs) {
      const handler = handlers[job.type];
      try {
        if (!handler) throw new Error(`no handler for job type ${job.type}`);
        await handler(job);
        await completeJob(job.id);
        processed++;
      } catch (err) {
        await failJob(job, err);
        failures.push(`${job.type}:${err instanceof Error ? err.message : String(err)}`);
      }
      if (Date.now() >= deadline) break;
    }
  }

  return NextResponse.json({ processed, failures: failures.slice(0, 10) });
}

export const GET = tick;
export const POST = tick;
