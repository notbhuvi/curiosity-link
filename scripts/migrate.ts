import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool, query } from "../src/server/db.js";

const schema = await readFile(resolve("database/schema.sql"), "utf8");

await query(schema);
await pool.end();

console.log("Database schema is ready.");
