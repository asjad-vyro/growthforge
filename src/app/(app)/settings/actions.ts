"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db/client";
import { requireProject, requireWorkspace } from "@/lib/auth";

export async function updateBrandKit(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  await requireProject(projectId);

  await db
    .update(schema.brandKits)
    .set({
      colors: {
        primary: String(formData.get("primary")),
        secondary: String(formData.get("secondary")),
        accent: String(formData.get("accent")),
        background: String(formData.get("background")),
        text: String(formData.get("text")),
      },
      toneOfVoice: String(formData.get("toneOfVoice")),
      doNotSay: String(formData.get("doNotSay"))
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      updatedAt: new Date(),
    })
    .where(eq(schema.brandKits.projectId, projectId));
  revalidatePath("/settings");
}

export async function updateBudget(formData: FormData) {
  const { workspace } = await requireWorkspace();
  const raw = String(formData.get("budget") ?? "").trim();
  const budget = raw === "" ? null : Number(raw);
  await db
    .update(schema.workspaces)
    .set({ monthlyBudgetUsd: budget !== null && Number.isFinite(budget) ? budget.toFixed(2) : null })
    .where(eq(schema.workspaces.id, workspace.id));
  revalidatePath("/settings");
}

export async function deleteProject(formData: FormData) {
  const projectId = String(formData.get("projectId"));
  await requireProject(projectId);
  await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
  redirect("/onboarding");
}
