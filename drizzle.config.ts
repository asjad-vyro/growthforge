import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // DDL wants the SESSION pooler (port 5432) — pass it as DATABASE_URL when running
    // drizzle-kit, e.g.: DATABASE_URL=$(grep '^MIGRATE_DATABASE_URL=' .env.local | cut -d= -f2-) npx drizzle-kit push
    url: process.env.DATABASE_URL || "postgres://localhost:5432/growthforge",
  },
});
