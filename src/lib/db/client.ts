import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Server-only Postgres client (service-level; bypasses RLS via the direct
// connection). Never import from client components.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: 5,
    // Supabase transaction-mode poolers don't support PREPARE
    prepare: false,
    // The pooler closes idle connections server-side; without this postgres.js
    // keeps them in the pool and eventually hands a job handler a dead socket
    // (seen as a "Failed query" on trivial statements). Recycle first.
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
export const sqlClient = client;
