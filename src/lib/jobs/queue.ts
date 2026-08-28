import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export type JobRow = typeof schema.jobs.$inferSelect;

export type EnqueueOptions = {
  dedupeKey?: string;
  runAfter?: Date;
  pipelineRunId?: string;
  maxAttempts?: number;
};

/** Insert a job; silently no-ops if dedupeKey already exists (webhook retries etc). */
export async function enqueue(
  type: string,
  payload: Record<string, unknown>,
  opts: EnqueueOptions = {},
): Promise<void> {
  await db
    .insert(schema.jobs)
    .values({
      type,
      payload,
      dedupeKey: opts.dedupeKey,
      runAfter: opts.runAfter ?? new Date(),
      pipelineRunId: opts.pipelineRunId,
      maxAttempts: opts.maxAttempts ?? 4,
    })
    .onConflictDoNothing({ target: schema.jobs.dedupeKey });
}

/**
 * Fire-and-forget nudge of the worker so queued jobs start immediately.
 * Vercel Cron sweeps every minute as the safety net.
 */
export function pokeWorker(): void {
  const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/jobs/tick`;
  void fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  }).catch(() => {});
}

export async function enqueueAndPoke(
  type: string,
  payload: Record<string, unknown>,
  opts: EnqueueOptions = {},
): Promise<void> {
  await enqueue(type, payload, opts);
  pokeWorker();
}

/** Claim up to `limit` due jobs atomically (FOR UPDATE SKIP LOCKED). */
export async function claimJobs(limit: number): Promise<JobRow[]> {
  const rows = await db.execute(sql`
    UPDATE jobs SET status = 'running', claimed_at = now(), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM jobs
      WHERE status = 'queued' AND run_after <= now()
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING *
  `);
  return camelizeJobs(rows as unknown as Record<string, unknown>[]);
}

export async function completeJob(id: string): Promise<void> {
  await db.execute(sql`UPDATE jobs SET status = 'done', error = NULL WHERE id = ${id}`);
}

export class NonRetriableError extends Error {}

/** Retry with exponential backoff via run_after; dead-letter after maxAttempts. */
export async function failJob(job: JobRow, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const permanent = err instanceof NonRetriableError || job.attempts >= job.maxAttempts;
  if (permanent) {
    await db.execute(
      sql`UPDATE jobs SET status = 'dead', error = ${message} WHERE id = ${job.id}`,
    );
  } else {
    const backoffS = Math.min(30 * 2 ** job.attempts, 900);
    await db.execute(sql`
      UPDATE jobs SET status = 'queued', claimed_at = NULL, error = ${message},
        run_after = now() + make_interval(secs => ${backoffS})
      WHERE id = ${job.id}
    `);
  }
}

/** Requeue jobs whose worker died mid-run (claimed >10 min ago, still 'running'). */
export async function reclaimStuckJobs(): Promise<void> {
  await db.execute(sql`
    UPDATE jobs SET
      status = CASE WHEN attempts >= max_attempts THEN 'dead' ELSE 'queued' END,
      claimed_at = NULL,
      error = coalesce(error, '') || ' [reclaimed by watchdog]'
    WHERE status = 'running' AND claimed_at < now() - interval '10 minutes'
  `);
}

function camelizeJobs(rows: Record<string, unknown>[]): JobRow[] {
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    payload: r.payload,
    status: r.status,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    runAfter: r.run_after,
    claimedAt: r.claimed_at,
    dedupeKey: r.dedupe_key,
    error: r.error,
    pipelineRunId: r.pipeline_run_id,
    createdAt: r.created_at,
  })) as JobRow[];
}
