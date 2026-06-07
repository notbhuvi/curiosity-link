import "dotenv/config";
import bcrypt from "bcryptjs";
import { query, pool } from "../src/server/db.js";

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required");
}

if (password.length < 10) {
  throw new Error("ADMIN_PASSWORD should be at least 10 characters");
}

const passwordHash = await bcrypt.hash(password, 12);

await query(
  `INSERT INTO admin_users (username, password_hash)
   VALUES ($1, $2)
   ON CONFLICT (username)
   DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [username, passwordHash]
);

await pool.end();
console.log(`Admin user ready: ${username}`);
