import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentProject } from "@/lib/auth";
import { Card, CardTitle, EmptyState } from "@/components/ui";
import { signedUrl, BUCKETS } from "@/lib/storage";
import type { TrendReport } from "@/lib/llm/schemas/trends";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const { project } = await currentProject();
  if (!project) redirect("/onboarding");

  const [reportRow] = await db
    .select()
    .from(schema.trendReports)
    .where(eq(schema.trendReports.projectId, project.id))
    .orderBy(desc(schema.trendReports.createdAt))
    .limit(1);

  if (!reportRow) {
    return (
      <EmptyState
        title="No trend report yet"
        body="Run the pipeline from the dashboard — the trend report lands here once analysis completes."
      />
    );
  }
  const report = reportRow.report as TrendReport;

  // Resolve exemplar posts for the top topics
  const exemplarIds = [
    ...new Set(report.trending_topics.flatMap((t) => t.evidence_post_ids.slice(0, 2))),
  ].slice(0, 12);
  const exemplars = exemplarIds.length
    ? await db
        .select()
        .from(schema.scrapedPosts)
        .where(inArray(schema.scrapedPosts.id, exemplarIds))
    : [];
  const exemplarThumbs = new Map<string, string>();
  for (const post of exemplars) {
    const thumb = post.media?.find((m) => m.thumbPath)?.thumbPath;
    if (thumb) {
      try {
        exemplarThumbs.set(post.id, await signedUrl(BUCKETS.scrapedMedia, thumb, 3600));
      } catch {}
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trend report</h1>
        <p className="mt-1 text-sm text-muted">
          v{reportRow.version} · {new Date(reportRow.createdAt).toLocaleDateString()} ·{" "}
          {(reportRow.corpusStats as { total?: number })?.total ?? "?"} posts analyzed
        </p>
      </div>

      <Card>
        <CardTitle>Summary</CardTitle>
        <p className="text-sm leading-relaxed">{report.summary}</p>
      </Card>

      <Card>
        <CardTitle>Campaign angles for {project.name}</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {report.content_angles.map((a, i) => (
            <div key={i} className="rounded-lg border border-edge bg-surface-2 p-4">
              <p className="font-semibold">{a.angle}</p>
              <p className="mt-1 text-sm text-muted">{a.maps_to_usp}</p>
              {a.suggested_hook ? (
                <p className="mt-2 text-sm italic text-accent">“{a.suggested_hook}”</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.recommended_asset_types.map((t) => (
                  <span key={t} className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                    {t.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Trending topics</CardTitle>
        <div className="flex flex-col gap-3">
          {report.trending_topics.map((t, i) => (
            <div key={i} className="rounded-lg bg-surface-2 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{t.topic}</p>
                <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs text-accent">
                  {Math.round(t.engagement_index)} / 100
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{t.why_now}</p>
              <p className="mt-1 text-xs text-muted">{t.platforms.join(" · ")}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Hooks that work</CardTitle>
          <div className="flex flex-col gap-3">
            {report.hooks.slice(0, 8).map((h, i) => (
              <div key={i} className="rounded-lg bg-surface-2 p-3">
                <p className="text-sm font-medium">{h.pattern}</p>
                <p className="mt-1 font-mono text-xs text-accent">{h.fill_in_template}</p>
                <p className="mt-1 text-xs text-muted">{h.platform}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Winning formats</CardTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2">Format</th>
                <th className="pb-2">Platform</th>
                <th className="pb-2 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {report.formats.slice(0, 10).map((f, i) => (
                <tr key={i} className="border-t border-edge">
                  <td className="py-2">{f.format}</td>
                  <td className="py-2 text-muted">{f.platform}</td>
                  <td className="py-2 text-right text-accent">{Math.round(f.engagement_index)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {report.posting_patterns ? (
        <Card>
          <CardTitle>Best times to post</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(report.posting_patterns).map(([platform, p]) => (
              <div key={platform} className="rounded-lg bg-surface-2 p-4">
                <p className="text-xs uppercase tracking-wider text-muted">{platform.replace("_", " ")}</p>
                <p className="mt-2 text-sm">
                  {p.bestDays.map((d) => d.day).join(", ") || "—"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {p.bestHours.map((h) => `${h.hour}:00`).join(" · ") || "—"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {exemplars.length > 0 ? (
        <Card>
          <CardTitle>Exemplar posts</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exemplars.map((post) => (
              <a
                key={post.id}
                href={post.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border border-edge bg-surface-2 p-3 transition-colors hover:border-primary/50"
              >
                {exemplarThumbs.has(post.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exemplarThumbs.get(post.id)}
                    alt=""
                    className="mb-2 h-32 w-full rounded object-cover"
                  />
                ) : null}
                <p className="text-xs text-muted">
                  {post.platform.replace("_", " ")} · @{post.authorHandle ?? "?"}
                </p>
                <p className="mt-1 line-clamp-3 text-sm">{post.text}</p>
              </a>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Hashtags</CardTitle>
        <div className="flex flex-wrap gap-2">
          {report.hashtags.slice(0, 24).map((h, i) => (
            <span key={i} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">
              #{h.tag.replace(/^#/, "")}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
