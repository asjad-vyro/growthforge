import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireUser } from "@/lib/supabase/server";

/** Workspaces are created lazily on first authenticated touch. */
export async function getOrCreateWorkspace(userId: string) {
  const [existing] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.ownerId, userId));
  if (existing) return existing;
  const [created] = await db
    .insert(schema.workspaces)
    .values({ ownerId: userId })
    .onConflictDoNothing({ target: schema.workspaces.ownerId })
    .returning();
  if (created) return created;
  const [raced] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.ownerId, userId));
  return raced;
}

export async function requireWorkspace() {
  const user = await requireUser();
  const workspace = await getOrCreateWorkspace(user.id);
  return { user, workspace };
}

/** Ownership guard for API routes (server db bypasses RLS, so check explicitly). */
export async function requireProject(projectId: string) {
  const { user, workspace } = await requireWorkspace();
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(and(eq(schema.projects.id, projectId), eq(schema.projects.workspaceId, workspace.id)));
  if (!project) throw new Error("NOT_FOUND");
  return { user, workspace, project };
}

export async function currentProject() {
  const { workspace } = await requireWorkspace();
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.workspaceId, workspace.id))
    .orderBy(schema.projects.createdAt)
    .limit(1);
  return { workspace, project: project ?? null };
}
