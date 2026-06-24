import { readFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

function loadLocalEnv() {
  const path = join(process.cwd(), ".env.local");
  try {
    const contents = readFileSync(path, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const [key, ...valueParts] = line.split("=");
      process.env[key.trim()] ??= valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env.local is optional; DATABASE_URL may already be set by the shell or Vercel.
  }
}

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured. Add it to web/.env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");

for (const statement of schema.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean)) {
  await sql.query(statement);
}

console.log("Database schema is up to date.");
