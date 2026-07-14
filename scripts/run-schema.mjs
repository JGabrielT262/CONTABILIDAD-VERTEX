/**
 * Ejecuta supabase/schema.sql en la base de datos.
 * Uso: node scripts/run-schema.mjs
 */
import { readFileSync } from "fs";
import pg from "pg";

const { Client } = pg;

const env = {};
try {
  const content = readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    env[key.trim()] = rest.join("=").trim();
  }
} catch {
  console.error("No se encontró .env.local");
  process.exit(1);
}

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("Agrega DATABASE_URL en .env.local");
  process.exit(1);
}

const sql = readFileSync("supabase/schema.sql", "utf8");

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Conectado a Supabase PostgreSQL...");

  await client.query(sql);

  console.log("Esquema ejecutado correctamente.");
  console.log("- Tabla: movimientos");
  console.log("- Bucket: documentos");
  console.log("- Políticas RLS configuradas");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("already exists")) {
    console.log("Algunos objetos ya existían. Esquema parcialmente aplicado.");
  } else {
    console.error("Error:", msg);
    process.exit(1);
  }
} finally {
  await client.end();
}
