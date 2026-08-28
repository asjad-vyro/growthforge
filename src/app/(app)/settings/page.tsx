import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { currentProject } from "@/lib/auth";
import { Card, CardTitle, Field, inputClass } from "@/components/ui";
import { updateBrandKit, updateBudget, deleteProject } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { workspace, project } = await currentProject();
  if (!project) redirect("/onboarding");

  const [kit] = await db
    .select()
    .from(schema.brandKits)
    .where(eq(schema.brandKits.projectId, project.id));

  const usage = (await db.execute(sql`
    SELECT kind, count(*)::int AS calls, sum(cost_usd)::numeric(10,2) AS cost
    FROM usage_events
    WHERE workspace_id = ${workspace.id} AND created_at >= date_trunc('month', now())
    GROUP BY kind ORDER BY cost DESC
  `)) as unknown as { kind: string; calls: number; cost: string }[];
  const totalCost = usage.reduce((acc, u) => acc + Number(u.cost), 0);

  const colors = kit?.colors ?? {};

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardTitle>Usage this month</CardTitle>
        {usage.length === 0 ? (
          <p className="text-sm text-muted">No paid API calls yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2">Kind</th>
                <th className="pb-2 text-right">Calls</th>
                <th className="pb-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.kind} className="border-t border-edge">
                  <td className="py-2">{u.kind.replace("_", " ")}</td>
                  <td className="py-2 text-right text-muted">{u.calls}</td>
                  <td className="py-2 text-right">${Number(u.cost).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t border-edge font-semibold">
                <td className="py-2">Total</td>
                <td />
                <td className="py-2 text-right">${totalCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <form action={updateBudget} className="mt-5 flex items-end gap-3">
          <Field label="Monthly budget cap (USD)" hint="Pipeline halts before any paid step once hit. Empty = no cap.">
            <input
              name="budget"
              type="number"
              step="1"
              min="0"
              defaultValue={workspace.monthlyBudgetUsd ?? ""}
              className={inputClass}
            />
          </Field>
          <button className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/85">
            Save
          </button>
        </form>
      </Card>

      <Card>
        <CardTitle>Brand kit</CardTitle>
        <form action={updateBrandKit} className="flex flex-col gap-4">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {(["primary", "secondary", "accent", "background", "text"] as const).map((key) => (
              <Field key={key} label={key}>
                <input
                  name={key}
                  defaultValue={(colors as Record<string, string>)[key] ?? "#000000"}
                  className={`${inputClass} font-mono text-xs`}
                />
              </Field>
            ))}
          </div>
          <Field label="Tone of voice">
            <input name="toneOfVoice" defaultValue={kit?.toneOfVoice ?? ""} className={inputClass} />
          </Field>
          <Field label="Never say (comma-separated)">
            <input name="doNotSay" defaultValue={(kit?.doNotSay ?? []).join(", ")} className={inputClass} />
          </Field>
          <div>
            <button className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/85">
              Save brand kit
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Danger zone</CardTitle>
        <form action={deleteProject}>
          <input type="hidden" name="projectId" value={project.id} />
          <button className="cursor-pointer rounded-lg border border-danger/40 bg-danger/15 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/25">
            Delete project &quot;{project.name}&quot; and all its data
          </button>
        </form>
      </Card>
    </div>
  );
}
