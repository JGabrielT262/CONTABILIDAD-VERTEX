/**
 * Crea tabla usuarios y migra el admin desde app_auth / ACCESS_CODE
 * Uso: node scripts/setup-usuarios.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
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
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const schema = readFileSync(join(root, "supabase", "usuarios-schema.sql"), "utf8");
const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(schema);

  const { rows: existing } = await client.query(
    `SELECT id FROM usuarios WHERE puede_gestionar_perfiles = true LIMIT 1`
  );

  if (existing.length === 0) {
    let hash = null;
    const auth = await client.query(
      `SELECT password_hash FROM app_auth WHERE key = 'access_code' LIMIT 1`
    );
    if (auth.rows[0]?.password_hash) {
      hash = auth.rows[0].password_hash;
    } else {
      const code = env.ACCESS_CODE || "Jesus26244640";
      hash = await bcrypt.hash(code, 12);
    }

    await client.query(
      `INSERT INTO usuarios (
        nombre, password_hash,
        puede_crear_movimientos, puede_borrar_movimientos,
        puede_gestionar_perfiles, activo
      ) VALUES ($1, $2, true, true, true, true)`,
      ["Administrador", hash]
    );
    console.log("Usuario Administrador creado con todos los permisos.");
  } else {
    console.log("Ya existe un administrador.");
  }

  const { rows } = await client.query(
    `SELECT nombre, puede_crear_movimientos, puede_borrar_movimientos,
            puede_gestionar_perfiles, activo
     FROM usuarios ORDER BY created_at`
  );
  console.table(rows);
} finally {
  await client.end();
}
