// Store the imagine-mcp OAuth session (from scripts/imagine-login.mjs) into the
// app_secrets table so the pipeline can auto-refresh unattended.
// Usage: node --env-file=.env.local scripts/seed-imagine-tokens.mjs
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const state = JSON.parse(await readFile(new URL("../.imagine-mcp-tokens.json", import.meta.url), "utf8"));
if (!state.tokens?.access_token) {
  console.error("No tokens in .imagine-mcp-tokens.json — run scripts/imagine-login.mjs first.");
  process.exit(1);
}
const value = { tokens: state.tokens, clientInformation: state.clientInformation };

const dbUrl = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Set DATABASE_URL (use: node --env-file=.env.local ...)");
  process.exit(1);
}
const sql = postgres(dbUrl, { prepare: false });
await sql`
  INSERT INTO app_secrets (key, value, updated_at)
  VALUES ('imagine_mcp_oauth', ${sql.json(value)}, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
`;
await sql.end();
console.log("✓ imagine_mcp_oauth seeded into app_secrets (refresh_token:", Boolean(state.tokens.refresh_token), ")");
