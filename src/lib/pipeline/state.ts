import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export async function setRunStatus(
  pipelineRunId: string,
  status: string,
  extra: { error?: string } = {},
): Promise<void> {
  await db
    .update(schema.pipelineRuns)
    .set({
      status,
      error: extra.error,
      ...(status === "scraping" ? { startedAt: new Date() } : {}),
      ...(["completed", "partial", "failed"].includes(status) ? { finishedAt: new Date() } : {}),
    })
    .where(eq(schema.pipelineRuns.id, pipelineRunId));
}

export async function bumpStageProgress(
  pipelineRunId: string,
  stage: string,
  done: number,
  total: number,
): Promise<void> {
  await db.execute(sql`
    UPDATE pipeline_runs
    SET stage_progress = coalesce(stage_progress, '{}'::jsonb) ||
      jsonb_build_object(${stage}::text, jsonb_build_object('done', ${done}::int, 'total', ${total}::int))
    WHERE id = ${pipelineRunId}
  `);
}

export async function getRunWithProject(pipelineRunId: string) {
  const [run] = await db
    .select()
    .from(schema.pipelineRuns)
    .where(eq(schema.pipelineRuns.id, pipelineRunId));
  if (!run) throw new Error(`pipeline_run ${pipelineRunId} not found`);
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, run.projectId));
  if (!project) throw new Error(`project ${run.projectId} not found`);
  const [brandKit] = await db
    .select()
    .from(schema.brandKits)
    .where(eq(schema.brandKits.projectId, project.id));
  return { run, project, brandKit };
}

/** Recompute per-platform engagement z-scores for a project. */
export async function recomputeEngagementScores(projectId: string): Promise<void> {
  await db.execute(sql`
    WITH scored AS (
      SELECT id,
        -- greatest(): platforms report -1 for hidden counts (e.g. Instagram
        -- hidden likes); ln() of a non-positive number aborts the whole update
        ln(1
          + greatest(coalesce((metrics->>'likes')::numeric, 0), 0)
          + 3 * greatest(coalesce((metrics->>'comments')::numeric, 0), 0)
          + 2 * greatest(coalesce((metrics->>'shares')::numeric, 0), 0)
          + greatest(coalesce((metrics->>'views')::numeric, 0), 0) / 50
        ) AS raw_score,
        platform
      FROM scraped_posts WHERE project_id = ${projectId}
    ),
    stats AS (
      SELECT platform, avg(raw_score) AS mu, greatest(stddev_samp(raw_score), 0.0001) AS sigma
      FROM scored GROUP BY platform
    )
    UPDATE scraped_posts p
    SET engagement_score = round(((s.raw_score - st.mu) / st.sigma)::numeric, 4)
    FROM scored s JOIN stats st ON st.platform = s.platform
    WHERE p.id = s.id
  `);
}
