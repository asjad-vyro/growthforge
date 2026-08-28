// Idempotent RLS + realtime setup. Run once after `drizzle-kit push` (or migrate):
//   node --env-file=.env.local scripts/apply-rls.mjs
// Safe to re-run: policies are dropped-and-recreated, publication adds tolerate duplicates.
import postgres from "postgres";

const dbUrl = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Set MIGRATE_DATABASE_URL (use: node --env-file=.env.local ...)");
  process.exit(1);
}
const sql = postgres(dbUrl, { prepare: false });

const RLS_TABLES = [
  "workspaces", "projects", "brand_kits", "pipeline_runs", "jobs", "scrape_jobs",
  "scraped_posts", "trend_reports", "generated_assets", "usage_events", "app_secrets",
];

// [table, policyName, command, usingExpr] — `jobs` and `app_secrets` get NO policies
// on purpose (server-only; the direct connection bypasses RLS).
const OWNER_VIA_PROJECT = `project_id IN
  (SELECT p.id FROM projects p JOIN workspaces w ON w.id = p.workspace_id WHERE w.owner_id = auth.uid())`;
const POLICIES = [
  ["workspaces", "workspaces_owner", "ALL", "owner_id = auth.uid()"],
  ["projects", "projects_owner", "ALL", "workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())"],
  ["brand_kits", "brand_kits_owner", "ALL", OWNER_VIA_PROJECT],
  ["pipeline_runs", "pipeline_runs_owner", "SELECT", OWNER_VIA_PROJECT],
  ["scrape_jobs", "scrape_jobs_owner", "SELECT", OWNER_VIA_PROJECT],
  ["scraped_posts", "scraped_posts_owner", "SELECT", OWNER_VIA_PROJECT],
  ["trend_reports", "trend_reports_owner", "SELECT", OWNER_VIA_PROJECT],
  ["generated_assets", "generated_assets_owner", "SELECT", OWNER_VIA_PROJECT],
  ["usage_events", "usage_events_owner", "SELECT", "workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())"],
];

for (const table of RLS_TABLES) {
  await sql.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
}
for (const [table, name, command, using] of POLICIES) {
  await sql.unsafe(`DROP POLICY IF EXISTS ${name} ON ${table}`);
  await sql.unsafe(`CREATE POLICY ${name} ON ${table} FOR ${command} USING (${using})`);
}
for (const table of ["pipeline_runs", "scrape_jobs", "generated_assets"]) {
  try {
    await sql.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table}`);
  } catch (err) {
    if (!/already member|duplicate/i.test(String(err))) throw err;
  }
}
await sql.end();
console.log("✓ RLS enabled on", RLS_TABLES.length, "tables;", POLICIES.length, "policies; realtime on 3 tables");
