import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export class BudgetExceededError extends Error {
  constructor(spent: number, budget: number) {
    super(
      `Workspace monthly budget exceeded: $${spent.toFixed(2)} spent of $${budget.toFixed(2)} cap`,
    );
  }
}

export type UsageKind =
  | "apify_run"
  | "llm_call"
  | "imagine_image"
  | "imagine_video";

export async function recordUsage(
  workspaceId: string,
  kind: UsageKind,
  costUsd: number,
  meta: Record<string, unknown> = {},
  units?: number,
): Promise<void> {
  await db.insert(schema.usageEvents).values({
    workspaceId,
    kind,
    costUsd: costUsd.toFixed(4),
    units: units?.toFixed(4),
    meta,
  });
}

/** Call before every paid step. Throws BudgetExceededError when a cap is set and hit. */
export async function assertBudget(workspaceId: string, estimatedCostUsd = 0): Promise<void> {
  const [ws] = await db
    .select({ budget: schema.workspaces.monthlyBudgetUsd })
    .from(schema.workspaces)
    .where(sql`${schema.workspaces.id} = ${workspaceId}`);
  const budget = ws?.budget ? Number(ws.budget) : null;
  if (!budget) return;

  const [row] = await db.execute(sql`
    SELECT coalesce(sum(cost_usd), 0) AS spent FROM usage_events
    WHERE workspace_id = ${workspaceId} AND created_at >= date_trunc('month', now())
  `) as unknown as { spent: string }[];
  const spent = Number(row?.spent ?? 0);
  if (spent + estimatedCostUsd > budget) throw new BudgetExceededError(spent, budget);
}

/** Rough LLM cost estimate for usage_events (OpenRouter blended, USD/Mtok). */
export function estimateLlmCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
}
