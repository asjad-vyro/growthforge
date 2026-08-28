import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireProject } from "@/lib/auth";
import { enqueueAndPoke } from "@/lib/jobs/queue";

export async function POST(request: NextRequest) {
  try {
    const { projectId, force } = (await request.json()) as { projectId?: string; force?: boolean };
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    const { project } = await requireProject(projectId);

    // Cost cap: ≤1 run per project per 7 days without explicit override
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [recent] = await db
      .select({ id: schema.pipelineRuns.id, createdAt: schema.pipelineRuns.createdAt })
      .from(schema.pipelineRuns)
      .where(
        and(
          eq(schema.pipelineRuns.projectId, project.id),
          gte(schema.pipelineRuns.createdAt, weekAgo),
          inArray(schema.pipelineRuns.status, ["completed", "partial"]),
        ),
      )
      .orderBy(desc(schema.pipelineRuns.createdAt))
      .limit(1);
    if (recent && !force) {
      return NextResponse.json(
        { error: "recent_run_exists", lastRunAt: recent.createdAt },
        { status: 409 },
      );
    }

    // Don't stack concurrent runs
    const [active] = await db
      .select({ id: schema.pipelineRuns.id })
      .from(schema.pipelineRuns)
      .where(
        and(
          eq(schema.pipelineRuns.projectId, project.id),
          inArray(schema.pipelineRuns.status, ["queued", "scraping", "analyzing", "generating"]),
        ),
      )
      .limit(1);
    if (active) {
      return NextResponse.json({ error: "run_in_progress", runId: active.id }, { status: 409 });
    }

    const [run] = await db
      .insert(schema.pipelineRuns)
      .values({ projectId: project.id, status: "queued" })
      .returning({ id: schema.pipelineRuns.id });

    await enqueueAndPoke(
      "run.start",
      { pipelineRunId: run.id },
      { dedupeKey: `run.start:${run.id}`, pipelineRunId: run.id },
    );
    return NextResponse.json({ runId: run.id });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "run launch failed" }, { status: 500 });
  }
}
