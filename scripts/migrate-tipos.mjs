/**
 * Actualiza el constraint de tipos de movimiento.
 * Uso: node scripts/migrate-tipos.mjs
 */
import { readFileSync } from "fs";
import pg from "pg";

const env = {};
const content = readFileSync(".env.local", "utf8");
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  env[key.trim()] = rest.join("=").trim();
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync("supabase/tipos-migration.sql", "utf8");

try {
  await client.connect();
  await client.query(sql);
  console.log("Tipos de movimiento actualizados correctamente.");
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
