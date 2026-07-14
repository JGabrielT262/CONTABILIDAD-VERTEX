/**
 * Aplica migración de préstamos (fecha_devolucion, prestamo_id, cobro_prestamo)
 * Uso: node scripts/migrate-prestamos.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const env = {};
const content = readFileSync(join(root, ".env.local"), "utf8");
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  env[key.trim()] = rest.join("=").trim();
}

if (!env.DATABASE_URL) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const sql = readFileSync(
  join(root, "supabase", "prestamos-migration.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log("Migración de préstamos aplicada correctamente.");
} finally {
  await client.end();
}
