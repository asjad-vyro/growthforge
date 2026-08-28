import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentProject } from "@/lib/auth";
import { Card, CardTitle, StatusBadge, EmptyState } from "@/components/ui";
import { RunStatusRefresher } from "@/components/run-status";
import { LaunchRunButton } from "@/components/launch-run";
import type { TrendReport } from "@/lib/llm/schemas/trends";

export const dynamic = "force-dynamic";

const STAGES: { key: string; label: string }[] = [
  { key: "scrape", label: "Scraping" },
  { key: "analyze", label: "Analyzing trends" },
  { key: "generate", label: "Generating assets" },
];

export default async function DashboardPage() {
  const { project } = await currentProject();
  if (!project) redirect("/onboarding");

  const [run] = await db
    .select()
    .from(schema.pipelineRuns)
    .where(eq(schema.pipelineRuns.projectId, project.id))
    .orderBy(desc(schema.pipelineRuns.createdAt))
    .limit(1);

  const scrapeJobs = run
    ? await db.select().from(schema.scrapeJobs).where(eq(schema.scrapeJobs.pipelineRunId, run.id))
    : [];

  const [latestReport] = await db
    .select()
    .from(schema.trendReports)
    .where(eq(schema.trendReports.projectId, project.id))
    .orderBy(desc(schema.trendReports.createdAt))
    .limit(1);

  const recentAssets = await db
    .select()
    .from(schema.generatedAssets)
    .where(eq(schema.generatedAssets.projectId, project.id))
    .orderBy(desc(schema.generatedAssets.createdAt))
    .limit(8);

  const report = latestReport?.report as TrendReport | undefined;
  const isActive = run && ["queued", "scraping", "analyzing", "generating"].includes(run.status);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <RunStatusRefresher runStatus={run?.status ?? null} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {project.nicheKeywords?.slice(0, 5).join(" · ")}
          </p>
        </div>
        <LaunchRunButton projectId={project.id} disabled={Boolean(isActive)} />
      </div>

      {run ? (
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Pipeline</CardTitle>
            <StatusBadge status={run.status} />
          </div>
          <div className="flex flex-col gap-3">
            {STAGES.map((stage) => {
              const p = run.stageProgress?.[stage.key];
              const pct = p && p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <div key={stage.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{stage.label}</span>
                    <span className="text-muted">{p ? `${p.done}/${p.total}` : "—"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {scrapeJobs.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {scrapeJobs.map((sj) => (
                <div key={sj.id} className="rounded-lg bg-surface-2 p-3">
                  <p className="text-xs text-muted">{sj.platform.replace("_", " ")}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusBadge status={sj.status} />
                    <span className="text-xs text-muted">{sj.postCount || ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {run.error ? <p className="mt-4 text-sm text-danger">{run.error}</p> : null}
        </Card>
      ) : (
        <EmptyState
          title="No pipeline run yet"
          body="Launch your first analysis to scrape your market, extract trends and generate assets."
        />
      )}

      {report ? (
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Latest trend report</CardTitle>
            <Link href="/trends" className="text-sm text-primary hover:underline">
              View full report →
            </Link>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">{report.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {report.trending_topics.slice(0, 5).map((t) => (
              <span key={t.topic} className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
                {t.topic}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {recentAssets.length > 0 ? (
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Recent assets</CardTitle>
            <Link href="/library" className="text-sm text-primary hover:underline">
              Open library →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {recentAssets.map((a) => (
              <div key={a.id} className="rounded-lg bg-surface-2 p-3">
                <p className="text-xs capitalize text-muted">{a.type.replace("_", " ")}</p>
                <div className="mt-1">
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
