/**
 * Conserva al primer administrador y convierte el resto en operadores:
 * crear/subir = sí, borrar = no, perfiles = no.
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

if (!env.DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const { rows: admins } = await client.query(
    `SELECT id FROM usuarios
     WHERE puede_gestionar_perfiles = true
     ORDER BY created_at ASC
     LIMIT 1`
  );

  const adminId = admins[0]?.id;
  if (!adminId) throw new Error("No se encontró el Administrador principal");

  await client.query(
    `UPDATE usuarios
     SET puede_crear_movimientos = true,
         puede_borrar_movimientos = false,
         puede_gestionar_perfiles = false,
         updated_at = NOW()
     WHERE id <> $1`,
    [adminId]
  );

  const { rows } = await client.query(
    `SELECT nombre, puede_crear_movimientos, puede_borrar_movimientos,
            puede_gestionar_perfiles, activo
     FROM usuarios
     ORDER BY created_at`
  );
  console.table(rows);
} finally {
  await client.end();
}
