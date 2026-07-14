/**
 * Actualiza los datos fiscales de las facturas de Rolando's.
 * Uso: node scripts/update-rolandos-facturas.mjs
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
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const comprobantes = ["F001-1", "F001-2", "F001-3"];
const ruc = "20611393238";
const razonSocial = "RESTAURANTE Y BUNGALOWS ROLANDO'S E.I.R.L.";

await client.connect();
try {
  const result = await client.query(
    `
    UPDATE movimientos
    SET ruc = $1,
        razon_social = $2
    WHERE tipo = 'venta'
      AND comprobante_tipo = 'factura'
      AND comprobante_numero = ANY($3::text[])
    RETURNING fecha, comprobante_numero, ruc, razon_social;
    `,
    [ruc, razonSocial, comprobantes]
  );

  console.table(result.rows);
  console.log(`Facturas actualizadas: ${result.rowCount}`);
} finally {
  await client.end();
}
