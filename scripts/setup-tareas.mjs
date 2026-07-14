/**
 * Crea tabla tareas y carga las 4 facturas de fin de mes (jul-oct 2026)
 * Uso: node scripts/setup-tareas.mjs
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

const schema = readFileSync(join(root, "supabase", "tareas-schema.sql"), "utf8");

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const RUC = "20611393238";
const RAZON = "RESTAURANTE Y BUNGALOWS ROLANDO'S E.I.R.L.";
const TITULO = "Crear factura USD 750 + IGV (tipo de cambio del día)";
const DESC =
  "Factura de fin de mes por USD 750.00 + IGV. El monto en soles se calcula con el tipo de cambio del día. Cliente: RESTAURANTE Y BUNGALOWS ROLANDO'S E.I.R.L. · RUC 20611393238";

const fechas = [
  { source_key: "tarea-factura-rolando-2026-07", fecha: "2026-07-31" },
  { source_key: "tarea-factura-rolando-2026-08", fecha: "2026-08-31" },
  { source_key: "tarea-factura-rolando-2026-09", fecha: "2026-09-30" },
  { source_key: "tarea-factura-rolando-2026-10", fecha: "2026-10-31" },
];

await client.connect();
try {
  await client.query(schema);

  for (const row of fechas) {
    await client.query(
      `
      INSERT INTO tareas (
        source_key, titulo, descripcion, fecha, tipo,
        monto_usd, ruc, razon_social, estado
      ) VALUES ($1, $2, $3, $4, 'factura', 750, $5, $6, 'pendiente')
      ON CONFLICT (source_key) DO UPDATE SET
        titulo = EXCLUDED.titulo,
        descripcion = EXCLUDED.descripcion,
        fecha = EXCLUDED.fecha,
        tipo = EXCLUDED.tipo,
        monto_usd = EXCLUDED.monto_usd,
        ruc = EXCLUDED.ruc,
        razon_social = EXCLUDED.razon_social;
      `,
      [row.source_key, TITULO, DESC, row.fecha, RUC, RAZON]
    );
  }

  const { rows } = await client.query(
    `SELECT fecha, titulo, monto_usd, ruc, estado
     FROM tareas
     WHERE source_key LIKE 'tarea-factura-rolando-%'
     ORDER BY fecha`
  );
  console.table(rows);
  console.log("Tareas de factura cargadas correctamente.");
} finally {
  await client.end();
}
