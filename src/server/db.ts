import pg from "pg";
import type { QueryResultRow } from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const databaseUrl = process.env.DATABASE_URL;
const isLocalDatabase =
  databaseUrl.includes("localhost") ||
  databaseUrl.includes("127.0.0.1") ||
  databaseUrl.includes("postgres:5432");
const useSsl =
  process.env.DATABASE_SSL === "true" || (process.env.NODE_ENV === "production" && !isLocalDatabase);

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}
