/**
 * Guarda la clave de acceso hasheada (bcrypt) en Supabase.
 * Uso: node scripts/seed-auth.mjs [clave]
 */
import { readFileSync } from "fs";
import bcrypt from "bcryptjs";
import pg from "pg";

const password = process.argv[2] || "Jesus26244640";

const env = {};
const content = readFileSync(".env.local", "utf8");
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const [key, ...rest] = trimmed.split("=");
  env[key.trim()] = rest.join("=").trim();
}

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const authSchema = readFileSync("supabase/auth-schema.sql", "utf8");
const hash = await bcrypt.hash(password, 12);

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(authSchema);

  await client.query(
    `INSERT INTO app_auth (key, password_hash, updated_at)
     VALUES ('access_code', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET password_hash = $1, updated_at = NOW()`,
    [hash]
  );

  console.log("Clave de acceso guardada en BD (hash bcrypt).");
  console.log("La contraseña nunca se almacena en texto plano.");
} catch (err) {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
